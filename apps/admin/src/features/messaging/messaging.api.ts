import {
  adminThreadSummarySchema,
  messageSchema,
  threadSchema,
  type SendMessageBody,
} from '@cofarm/contracts/messaging';

import { request } from '@/lib/api-client.ts';

const threadPageSchema = threadSchema.transform(({ messages, olderCursor, ...head }) => ({
  ...head,
  items: messages,
  nextCursor: olderCursor,
}));

export function fetchThreadPage(threadId: string, cursor: string | undefined) {
  const params = new URLSearchParams({ limit: '30' });
  if (cursor !== undefined) params.set('cursor', cursor);

  return request(`/v1/threads/${threadId}?${params.toString()}`, threadPageSchema);
}

export function sendThreadMessage(threadId: string, body: SendMessageBody) {
  return request(`/v1/threads/${threadId}/messages`, messageSchema, { method: 'POST', body });
}

export function resolveThread(threadId: string) {
  return request(`/v1/threads/${threadId}/resolve`, adminThreadSummarySchema, { method: 'POST' });
}

export function reopenThread(threadId: string) {
  return request(`/v1/threads/${threadId}/reopen`, adminThreadSummarySchema, { method: 'POST' });
}
