import { ERROR_CODES } from '@cofarm/contracts/errors';
import type { ProjectPartner } from '@cofarm/contracts/partners';
import type {
  IssueSignatureBody,
  ListSignaturesQuery,
  MySignatureRequest,
  RemindAllResult,
  SignaturePage,
  SignatureRequest,
  SignSignatureBody,
} from '@cofarm/contracts/signatures';
import type { EntityType } from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';

import * as cursor from '../../lib/cursor.ts';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.ts';
import { ADMIN_SCOPE, assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as documents from '../documents/documents.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as partners from '../partners/partners.service.ts';

import * as repo from './signatures.repo.ts';

const DOCUMENT_ENTITY: EntityType = 'document';

export async function issueSignature(
  scope: ProjectScope,
  projectId: string,
  input: IssueSignatureBody,
): Promise<SignatureRequest> {
  assertInScope(scope, projectId);

  const document = await documents.assertDocumentInProject(input.documentId, projectId);
  const membership = await activeMembership(projectId, input.userId);
  if (membership === null) {
    throw unprocessable(
      ERROR_CODES.noActiveMembership,
      'That partner holds no active membership on this project',
    );
  }

  const created = await repo.insertRequest({
    id: newId(),
    projectId,
    documentId: document.id,
    userId: input.userId,
    status: 'pending',
    provider: 'manual',
    sentAt: new Date(),
  });

  await audit.record({
    action: 'signature.issued',
    entityTable: 'signature_requests',
    entityId: created.id,
    projectId,
    after: { ...created, ...(input.note === undefined ? {} : { note: input.note }) },
  });

  const detail = await repo.findRequest(ADMIN_SCOPE, created.id, undefined);
  if (detail === null) throw notFound('Signature request');

  await notifications.notifyUser({
    userId: detail.userId,
    projectId,
    type: 'document_issued',
    title: `${detail.projectCode} needs your signature`,
    body: input.note ?? `${detail.documentName} is ready for you to sign.`,
    entityType: DOCUMENT_ENTITY,
    entityId: detail.documentId,
    payload: {
      projectId,
      requestId: detail.id,
      documentId: detail.documentId,
    },
  });

  return toSignature(detail);
}

export async function listSignatures(
  scope: ProjectScope,
  query: ListSignaturesQuery,
): Promise<SignaturePage> {
  const rows = await repo.listRequests(scope, {
    status: query.status,
    projectId: query.projectId,
    limit: query.limit + 1,
    cursor: decodeCursor(query.cursor),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page.at(-1);

  return {
    items: page.map(toSignature),
    nextCursor: hasMore && last !== undefined ? encodeCursor(last) : null,
  };
}

export async function remindSignature(
  scope: ProjectScope,
  requestId: string,
): Promise<SignatureRequest> {
  const detail = await repo.findRequest(scope, requestId, undefined);
  if (detail === null) throw notFound('Signature request');
  assertPending(detail);

  const updated = await repo.patchRequest(requestId, { remindedAt: new Date() });
  if (updated === null) throw notFound('Signature request');

  await audit.record({
    action: 'signature.reminded',
    entityTable: 'signature_requests',
    entityId: requestId,
    projectId: detail.projectId,
    before: detail,
    after: updated,
  });

  await remind(detail);

  return toSignature({ ...detail, ...updated });
}

export async function remindAllSignatures(
  scope: ProjectScope,
  projectId: string,
): Promise<RemindAllResult> {
  assertInScope(scope, projectId);

  const pending = await repo.pendingForProject(scope, projectId);
  if (pending.length === 0) return { reminded: 0 };

  const remindedAt = new Date();
  await repo.stampReminded(
    pending.map((row) => row.id),
    remindedAt,
  );

  for (const row of pending) {
    await audit.record({
      action: 'signature.reminded',
      entityTable: 'signature_requests',
      entityId: row.id,
      projectId,
      before: row,
      after: { ...row, remindedAt },
    });
    await remind(row);
  }

  return { reminded: pending.length };
}

export async function cancelSignature(
  scope: ProjectScope,
  requestId: string,
): Promise<SignatureRequest> {
  const detail = await repo.findRequest(scope, requestId, undefined);
  if (detail === null) throw notFound('Signature request');
  assertPending(detail);

  const updated = await repo.patchRequest(requestId, { status: 'cancelled' });
  if (updated === null) throw notFound('Signature request');

  await audit.record({
    action: 'signature.cancelled',
    entityTable: 'signature_requests',
    entityId: requestId,
    projectId: detail.projectId,
    before: detail,
    after: updated,
  });

  return toSignature({ ...detail, ...updated });
}

export async function listMySignatures(
  scope: ProjectScope,
  userId: string,
): Promise<MySignatureRequest[]> {
  const rows = await repo.requestsForUser(scope, userId);
  return rows.map(toMySignature);
}

/**
 * The acknowledgement stands in for an e-signature, so the record of who typed
 * their name, when, and from which address is the entire evidence trail.
 */
export type SignInput = {
  scope: ProjectScope;
  userId: string;
  requestId: string;
  body: SignSignatureBody;
  signedIp: string | null;
};

export async function signSignature(input: SignInput): Promise<MySignatureRequest> {
  const { scope, userId, requestId, signedIp } = input;
  const detail = await repo.findRequest(scope, requestId, userId);
  if (detail === null) throw notFound('Signature request');
  assertPending(detail);

  const signedName = input.body.signedName.trim();
  if (signedName.length === 0) throw badRequest('A signature needs the signer name');

  const updated = await repo.patchRequest(requestId, {
    status: 'signed',
    signedAt: new Date(),
    signedName,
    signedIp,
  });
  if (updated === null) throw notFound('Signature request');

  await audit.record({
    action: 'signature.signed',
    entityTable: 'signature_requests',
    entityId: requestId,
    projectId: detail.projectId,
    before: detail,
    after: updated,
  });

  if (detail.documentType === 'agreement') {
    await markAgreementSigned(detail.projectId, userId);
  }

  return toMySignature({ ...detail, ...updated });
}

/** The partnership agreement is the membership's own agreement: signing it is
 * what moves `agreementStatus` on, and only the partners module may write it. */
async function markAgreementSigned(projectId: string, userId: string): Promise<void> {
  const membership = await activeMembership(projectId, userId);
  if (membership === null || membership.agreementStatus === 'signed') return;

  await partners.updateMembership(userId, membership.membershipId, {
    agreementStatus: 'signed',
  });
}

async function activeMembership(projectId: string, userId: string): Promise<ProjectPartner | null> {
  const onProject = await partners.listProjectPartners(ADMIN_SCOPE, projectId);
  return onProject.find((row) => row.partnerId === userId && row.status === 'active') ?? null;
}

async function remind(detail: repo.SignatureDetailRow): Promise<void> {
  await notifications.notifyUser({
    userId: detail.userId,
    projectId: detail.projectId,
    type: 'reminder',
    title: `Reminder: ${detail.projectCode} needs your signature`,
    body: `${detail.documentName} is still waiting for your signature.`,
    entityType: DOCUMENT_ENTITY,
    entityId: detail.documentId,
    payload: {
      projectId: detail.projectId,
      requestId: detail.id,
      documentId: detail.documentId,
    },
  });
}

function assertPending(detail: repo.SignatureDetailRow): void {
  if (detail.status === 'pending') return;
  throw conflict(
    ERROR_CODES.signatureAlreadySettled,
    `This signature request is already ${detail.status}`,
  );
}

function toSignature(row: repo.SignatureDetailRow): SignatureRequest {
  return {
    ...toMySignature(row),
    userId: row.userId,
    partnerName: row.partnerName,
  };
}

function toMySignature(row: repo.SignatureDetailRow): MySignatureRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    documentId: row.documentId,
    documentName: row.documentName,
    documentType: row.documentType,
    status: row.status,
    signedName: row.signedName,
    sentAt: row.sentAt.toISOString(),
    signedAt: row.signedAt?.toISOString() ?? null,
    remindedAt: row.remindedAt?.toISOString() ?? null,
  };
}

function encodeCursor(row: repo.SignatureDetailRow): string {
  return cursor.encodeCursor(row.sentAt.toISOString(), row.id);
}

function decodeCursor(raw: string | undefined): repo.SignatureCursor | undefined {
  const decoded = cursor.decodeCursor(raw);
  if (decoded === undefined) return undefined;
  return { sentAt: cursor.cursorTimestamp(decoded.sortKey), id: decoded.id };
}

/** Documents awaiting this partner's signature, for the dashboard badge. */
export function countPendingForUser(userId: string): Promise<number> {
  return repo.countPendingForUser(userId);
}
