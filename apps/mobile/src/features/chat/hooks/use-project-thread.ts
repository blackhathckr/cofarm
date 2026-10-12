import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchProjectThread } from '../chat.api.ts';

/**
 * Page one holds the newest messages and each further page holds older ones,
 * so the flattened transcript reads oldest first.
 */
export function useProjectThread(projectId: string | null) {
  return useCursorList({
    queryKey: ['threads', 'project', projectId],
    fetchPage: (cursor) => fetchProjectThread(projectId ?? '', cursor),
    enabled: projectId !== null,
    isNewestFirst: true,
    pollNewestMs: 4_000,
    identify: (message) => message.id,
  });
}
