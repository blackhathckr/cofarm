import type { ListPartnersQuery } from '@cofarm/contracts/partners';
import { useQuery } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchPartner, fetchPartners } from '../partners.api.ts';

export function usePartners(query: Partial<ListPartnersQuery> = {}) {
  return useCursorList({
    queryKey: ['partners', query],
    fetchPage: (cursor) => fetchPartners({ ...query, cursor }),
  });
}

export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: ['partners', partnerId],
    queryFn: () => fetchPartner(partnerId),
  });
}
