import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchActivityLog } from '../project.api.ts';

export function useActivityLog(projectId: string | null) {
  return useCursorList({
    queryKey: ['projects', projectId, 'activity'],
    fetchPage: (cursor) => fetchActivityLog(projectId ?? '', cursor),
    enabled: projectId !== null,
  });
}
