import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchMyStatements } from '../harvest.api.ts';

/** `totals` spans every statement the partner holds, so it is read off any page. */
export function useMyStatements() {
  return useCursorList({
    queryKey: ['statements', 'mine'],
    fetchPage: fetchMyStatements,
  });
}
