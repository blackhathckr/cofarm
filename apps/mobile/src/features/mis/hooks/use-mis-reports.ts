import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchMisPage } from '../mis.api.ts';

export function useMisReports(projectId: string | null) {
  return useCursorList({
    queryKey: ['projects', projectId, 'mis'],
    fetchPage: (cursor) => fetchMisPage(projectId ?? '', cursor),
    enabled: projectId !== null,
  });
}
