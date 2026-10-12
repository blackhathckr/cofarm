import type {
  Document,
  DownloadTicket,
  ListDocumentsQuery,
  UploadTicket,
  UploadUrlBody,
} from '@cofarm/contracts/documents';
import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor, hasPermission } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import type { DocumentPage, DocumentViewer } from './documents.service.ts';
import * as service from './documents.service.ts';

type DocumentParams = { documentId: string };

function viewerOf(request: FastifyRequest): DocumentViewer {
  const actor = assertActor(request.actor);
  return {
    userId: actor.userId,
    scope: assertScope(request.scope),
    canReadAll: actor.kind === 'admin' && hasPermission(actor, PERMISSIONS.documentRead),
  };
}

export async function uploadUrl(
  request: FastifyRequest<{ Body: UploadUrlBody }>,
  reply: FastifyReply,
): Promise<UploadTicket> {
  const actor = assertActor(request.actor);
  const ticket = await service.requestUploadUrl(
    assertScope(request.scope),
    actor.userId,
    request.body,
  );
  void reply.status(201);
  return ticket;
}

export async function confirm(
  request: FastifyRequest<{ Params: DocumentParams }>,
): Promise<Document> {
  const actor = assertActor(request.actor);
  return service.confirmUpload(assertScope(request.scope), actor.userId, request.params.documentId);
}

export async function downloadUrl(
  request: FastifyRequest<{ Params: DocumentParams }>,
): Promise<DownloadTicket> {
  return service.issueDownloadUrl(viewerOf(request), request.params.documentId);
}

export async function list(
  request: FastifyRequest<{ Querystring: ListDocumentsQuery }>,
): Promise<DocumentPage> {
  const actor = assertActor(request.actor);
  return service.listDocuments(assertScope(request.scope), actor.userId, request.query);
}

export async function remove(
  request: FastifyRequest<{ Params: DocumentParams }>,
): Promise<{ ok: true }> {
  const actor = assertActor(request.actor);
  await service.deleteDocument(assertScope(request.scope), actor.userId, request.params.documentId);
  return { ok: true };
}
