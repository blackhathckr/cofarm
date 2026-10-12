import type { ListSignaturesQuery } from '@cofarm/contracts/signatures';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchSignatures } from '../signatures.api.ts';

export function useSignatures(query: Partial<ListSignaturesQuery> = {}) {
  return useCursorList({
    queryKey: ['signatures', query],
    fetchPage: (cursor) => fetchSignatures({ ...query, cursor }),
  });
}
