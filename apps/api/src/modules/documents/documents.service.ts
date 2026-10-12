import {
  isDocumentMime,
  maxUploadBytes,
  type Document,
  type DocumentMime,
  type DocumentType,
  type DownloadTicket,
  type ListDocumentsQuery,
  type UploadTicket,
  type UploadUrlBody,
} from '@cofarm/contracts/documents';
import { ERROR_CODES } from '@cofarm/contracts/errors';
import { newId } from '@cofarm/core/id';

import * as storage from '../../infra/storage.ts';
import { env } from '../../lib/env.ts';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../lib/errors.ts';
import { assertInScope, type ProjectScope } from '../../lib/project-scope.ts';
import { currentContext } from '../../lib/request-context.ts';
import * as audit from '../audit/audit.service.ts';
import * as partners from '../partners/partners.service.ts';

import * as repo from './documents.repo.ts';

export type DocumentPage = {
  items: Document[];
  nextCursor: string | null;
};

/** A partner reaches a document through their scope or their ownership of it. */
export type DocumentViewer = {
  userId: string;
  scope: ProjectScope;
  canReadAll: boolean;
};

const EXTENSIONS: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
};

export async function requestUploadUrl(
  scope: ProjectScope,
  uploaderUserId: string,
  input: UploadUrlBody,
): Promise<UploadTicket> {
  const limit = maxUploadBytes(input.mime);
  if (input.sizeBytes > limit) {
    throw badRequest(`A ${input.mime} upload may not exceed ${limit} bytes`);
  }
  if (input.projectId !== null) {
    assertInScope(scope, input.projectId);
  }

  const ownerUserId = await resolveOwner(scope, uploaderUserId, input);

  const documentId = newId();
  const storageKey = storage.buildStorageKey({
    projectId: input.projectId,
    kind: input.type,
    documentId,
    extension: EXTENSIONS[input.mime] ?? 'bin',
  });

  const created = await repo.insertDocument({
    id: documentId,
    projectId: input.projectId,
    ownerUserId,
    type: input.type,
    storageKey,
    originalName: input.originalName,
    mime: input.mime,
    sizeBytes: input.sizeBytes,
    uploadedBy: uploaderUserId,
  });

  await audit.record({
    action: 'document.created',
    entityTable: 'documents',
    entityId: created.id,
    projectId: created.projectId,
    after: created,
  });

  return {
    documentId: created.id,
    uploadUrl: await storage.presignUpload(storageKey, input.mime),
    storageKey,
    expiresInSeconds: env.SIGNED_URL_TTL_SECONDS,
  };
}

/**
 * The row is written before the client's PUT, so a row whose object is absent
 * is still pending. This is the only point at which the declared size and
 * content type are replaced by what storage actually holds.
 */
export async function confirmUpload(
  scope: ProjectScope,
  viewerUserId: string,
  documentId: string,
): Promise<Document> {
  const row = await repo.findVisible(scope, viewerUserId, documentId);
  if (row === null) throw notFound('Document');

  const stored = await storage.headObject(row.storageKey);
  if (stored === null) {
    throw unprocessable(ERROR_CODES.uploadIncomplete, 'The upload has not reached storage');
  }

  const mime = isDocumentMime(stored.contentType) ? stored.contentType : row.mime;
  const limit = maxUploadBytes(mime);
  if (stored.sizeBytes > limit) {
    await storage.deleteObject(row.storageKey);
    throw badRequest(`The uploaded file exceeds the ${limit} byte limit for ${mime}`);
  }

  const updated = await repo.updateDocument(documentId, {
    sizeBytes: stored.sizeBytes,
    mime,
    confirmedAt: new Date(),
  });
  if (updated === null) throw notFound('Document');

  await audit.record({
    action: 'document.confirmed',
    entityTable: 'documents',
    entityId: updated.id,
    projectId: updated.projectId,
    before: row,
    after: updated,
  });

  return toDocument(updated);
}

export async function issueDownloadUrl(
  viewer: DocumentViewer,
  documentId: string,
): Promise<DownloadTicket> {
  const row = viewer.canReadAll
    ? await repo.findDocument(documentId)
    : await repo.findVisible(viewer.scope, viewer.userId, documentId);
  if (row === null) throw notFound('Document');

  return {
    documentId: row.id,
    downloadUrl: await storage.presignDownload(row.storageKey, row.originalName),
    originalName: row.originalName,
    expiresInSeconds: env.SIGNED_URL_TTL_SECONDS,
  };
}

export async function listDocuments(
  scope: ProjectScope,
  viewerUserId: string,
  query: ListDocumentsQuery,
): Promise<DocumentPage> {
  if (query.projectId !== undefined) assertInScope(scope, query.projectId);

  const rows = await repo.listDocuments(scope, {
    projectId: query.projectId,
    ownerUserId: query.ownerUserId,
    viewerUserId,
    type: query.type,
    includePending: query.includePending,
    cursor: query.cursor,
    limit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items: page.map(toDocument),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function deleteDocument(
  scope: ProjectScope,
  viewerUserId: string,
  documentId: string,
): Promise<void> {
  const row = await repo.findVisible(scope, viewerUserId, documentId);
  if (row === null) throw notFound('Document');

  const removed = await repo.deleteDocument(documentId);
  if (!removed) {
    throw conflict(
      ERROR_CODES.documentReferenced,
      'This document is attached to another record and cannot be deleted',
    );
  }

  await storage.deleteObject(row.storageKey);

  await audit.record({
    action: 'document.deleted',
    entityTable: 'documents',
    entityId: documentId,
    projectId: row.projectId,
    before: row,
  });
}

/**
 * A project document is project-wide unless it is filed against one partner,
 * who must hold a membership on that project — otherwise an admin could file a
 * partner's file under a project they have nothing to do with. A document with
 * no project is personal by definition, so it falls to the uploader when no
 * owner is named; an admin filing one for a partner names them instead.
 */
async function resolveOwner(
  scope: ProjectScope,
  uploaderUserId: string,
  input: UploadUrlBody,
): Promise<string | null> {
  if (input.ownerUserId === undefined) {
    return input.projectId === null ? uploaderUserId : null;
  }
  if (!scope.allProjects && input.ownerUserId !== uploaderUserId) {
    throw forbidden('Only an administrator files a document for another partner');
  }

  const partner = await partners.getPartner(scope, input.ownerUserId);
  if (input.projectId === null) return partner.id;

  const onProject = partner.memberships.some(
    (membership) => membership.projectId === input.projectId,
  );
  if (!onProject) {
    throw unprocessable(
      ERROR_CODES.noActiveMembership,
      'That partner holds no membership on this project',
    );
  }
  return partner.id;
}

export type GeneratedDocument = {
  projectId: string;
  type: DocumentType;
  originalName: string;
  mime: DocumentMime;
  body: Uint8Array;
};

/**
 * The seam a module uses for a document it rendered itself. The object is in
 * storage before the row exists and the row is confirmed on insert: an
 * unconfirmed row reads as an abandoned upload and the sweeper would delete it.
 */
/**
 * Removes a file the server generated and nothing references any more. Unlike
 * `deleteDocument` this needs no viewer: a generated artefact has no owner and
 * is reproducible from the data it was rendered from.
 */
export async function discardGenerated(documentId: string): Promise<void> {
  const row = await repo.findDocument(documentId);
  if (row === null) return;

  const removed = await repo.deleteDocument(documentId);
  if (!removed) return;

  await storage.deleteObject(row.storageKey);
  await audit.record({
    action: 'document.deleted',
    entityTable: 'documents',
    entityId: documentId,
    projectId: row.projectId,
    before: row,
  });
}

export async function storeGeneratedDocument(input: GeneratedDocument): Promise<Document> {
  const documentId = newId();
  const storageKey = storage.buildStorageKey({
    projectId: input.projectId,
    kind: input.type,
    documentId,
    extension: EXTENSIONS[input.mime] ?? 'bin',
  });

  await storage.putObject(storageKey, input.body, input.mime);

  const created = await repo.insertDocument({
    id: documentId,
    projectId: input.projectId,
    ownerUserId: null,
    type: input.type,
    storageKey,
    originalName: input.originalName,
    mime: input.mime,
    sizeBytes: input.body.byteLength,
    uploadedBy: currentContext()?.actorUserId ?? null,
    confirmedAt: new Date(),
  });

  await audit.record({
    action: 'document.generated',
    entityTable: 'documents',
    entityId: created.id,
    projectId: created.projectId,
    after: created,
  });

  return toDocument(created);
}

export type StoredDocument = {
  mime: string;
  originalName: string;
  body: Buffer;
};

/**
 * The seam a module uses to read a document's bytes for a server-side render.
 * Null when the object is gone, so a caller can skip it rather than fail; it
 * carries no authorisation of its own and the caller must have established it.
 */
export async function readDocumentObject(documentId: string): Promise<StoredDocument | null> {
  const row = await repo.findDocument(documentId);
  if (row === null) return null;

  const bytes = await storage.getObject(row.storageKey);
  if (bytes === null) return null;

  return { mime: row.mime, originalName: row.originalName, body: Buffer.from(bytes) };
}

/** The seam other modules use to attach a document to one of their records. */
export async function assertDocumentInProject(
  documentId: string,
  projectId: string,
): Promise<Document> {
  const row = await repo.findInProject(documentId, projectId);
  if (row === null) throw notFound('Document');
  return toDocument(row);
}

/** One query for a whole set, so attaching many slips is not many round trips. */
export async function assertDocumentsInProject(
  documentIds: readonly string[],
  projectId: string,
): Promise<void> {
  const wanted = [...new Set(documentIds)];
  const found = await repo.findAllInProject(wanted, projectId);
  if (found.length !== wanted.length) throw notFound('Document');
}

function toDocument(row: repo.DocumentRow): Document {
  return {
    id: row.id,
    projectId: row.projectId,
    ownerUserId: row.ownerUserId,
    type: row.type,
    originalName: row.originalName,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export type SweepResult = { scanned: number; deleted: number };

/**
 * Removes rows whose presigned upload never completed. Only the row is dropped
 * when the object is genuinely absent; a row whose object did arrive is
 * confirmed late instead, so a slow client never loses its file.
 */
/** Removes attachments whose parent row is gone, rows and objects together. */
export async function discardMany(documentIds: readonly string[]): Promise<number> {
  let discarded = 0;
  for (const documentId of new Set(documentIds)) {
    const row = await repo.findDocument(documentId);
    if (row === null) continue;
    if (!(await repo.deleteDocument(documentId))) continue;

    await storage.deleteObject(row.storageKey);
    discarded += 1;
  }
  return discarded;
}

/**
 * The net under the immediate cleanup: whatever any path forgets to remove is
 * collected here, so a deleted record never leaves bytes behind for long.
 */
export async function sweepOrphanedAttachments(input: {
  before: Date;
  limit: number;
}): Promise<SweepResult> {
  const rows = await repo.listOrphanedAttachments(input.before, input.limit);
  let deleted = 0;

  for (const row of rows) {
    if (!(await repo.deleteDocument(row.id))) continue;
    await storage.deleteObject(row.storageKey);
    deleted += 1;
  }

  return { scanned: rows.length, deleted };
}

export async function sweepAbandoned(input: { before: Date; limit: number }): Promise<SweepResult> {
  const rows = await repo.listAbandoned(input.before, input.limit);
  let deleted = 0;

  for (const row of rows) {
    const stored = await storage.headObject(row.storageKey);
    if (stored !== null) {
      await repo.updateDocument(row.id, {
        sizeBytes: stored.sizeBytes,
        confirmedAt: new Date(),
      });
      continue;
    }
    if (await repo.deleteDocument(row.id)) deleted += 1;
  }

  return { scanned: rows.length, deleted };
}
