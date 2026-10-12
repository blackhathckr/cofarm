import { documentPageSchema, type DocumentType } from '@cofarm/contracts/documents';
import {
  messageSchema,
  threadReadResultSchema,
  threadSchema,
  threadSummarySchema,
  type SendMessageBody,
} from '@cofarm/contracts/messaging';
import { mySignatureRequestSchema } from '@cofarm/contracts/signatures';
import { z } from 'zod';

import { request } from '@/lib/api-client.ts';

const threadSummaryListSchema = z.array(threadSummarySchema);
const mySignatureListSchema = z.array(mySignatureRequestSchema);

const MESSAGE_PAGE_SIZE = 30;
const DOCUMENT_PAGE_SIZE = 20;

export function fetchMyThreads() {
  return request('/v1/me/threads', threadSummaryListSchema);
}

/**
 * The cursor walks backwards: it marks the oldest message already held. A
 * thread names its page fields `messages` and `olderCursor`, so they are
 * aliased onto the shape every paged list is read through.
 */
export async function fetchProjectThread(projectId: string, olderThan: string | null) {
  const query = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
  if (olderThan !== null) query.set('cursor', olderThan);

  const thread = await request(
    `/v1/projects/${projectId}/thread?${query.toString()}`,
    threadSchema,
  );
  return { ...thread, items: thread.messages, nextCursor: thread.olderCursor };
}

export function sendThreadMessage(projectId: string, body: SendMessageBody) {
  return request(`/v1/projects/${projectId}/thread/messages`, messageSchema, {
    method: 'POST',
    body,
  });
}

export function markThreadRead(projectId: string) {
  return request(`/v1/projects/${projectId}/thread/read`, threadReadResultSchema, {
    method: 'POST',
  });
}

export function fetchMySignatures() {
  return request('/v1/me/signatures', mySignatureListSchema);
}

export function signDocument(requestId: string, signedName: string, idempotencyKey: string) {
  return request(`/v1/signatures/${requestId}/sign`, mySignatureRequestSchema, {
    method: 'POST',
    body: { signedName, agreed: true },
    idempotencyKey,
  });
}

export function fetchProjectDocuments(projectId: string, type: DocumentType) {
  const query = new URLSearchParams({ projectId, type, limit: String(DOCUMENT_PAGE_SIZE) });

  return request(`/v1/documents?${query.toString()}`, documentPageSchema);
}
