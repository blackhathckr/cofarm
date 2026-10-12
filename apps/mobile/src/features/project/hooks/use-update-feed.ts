import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchUpdateFeed } from '../project.api.ts';

export function useUpdateFeed(projectId: string | null) {
  return useCursorList({
    queryKey: ['projects', projectId, 'updates', 'feed'],
    fetchPage: (cursor) => fetchUpdateFeed(projectId ?? '', cursor),
    enabled: projectId !== null,
  });
}
