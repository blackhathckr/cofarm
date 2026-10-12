import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchThreadPage } from '../messaging.api.ts';

/**
 * The thread pages backwards: each page holds its own messages oldest-first and
 * the cursor points further into the past, so page order is newest-first.
 */
export function useThread(threadId: string | null) {
  return useCursorList({
    queryKey: ['threads', 'detail', threadId],
    fetchPage: (cursor) => fetchThreadPage(threadId ?? '', cursor),
    enabled: threadId !== null,
    isNewestFirst: true,
    pollNewestMs: 4_000,
    identify: (message) => message.id,
  });
}
