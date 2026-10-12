import { adminThreadPageSchema, type ListThreadsQuery } from '@cofarm/contracts/messaging';

import { request } from './api-client.ts';
import { useCursorList } from './cursor-list.ts';

function fetchThreads(query: Partial<ListThreadsQuery>, cursor: string | undefined) {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.projectId !== undefined) params.set('projectId', query.projectId);
  if (query.userId !== undefined) params.set('userId', query.userId);
  if (cursor !== undefined) params.set('cursor', cursor);
  params.set('limit', String(query.limit ?? 50));

  return request(`/v1/threads?${params.toString()}`, adminThreadPageSchema);
}

export function useThreads(query: Partial<ListThreadsQuery> = {}) {
  return useCursorList({
    queryKey: ['threads', query],
    fetchPage: (cursor) => fetchThreads(query, cursor),
    pollNewestMs: 30_000,
    identify: (thread) => thread.id,
  });
}
