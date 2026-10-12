import { useQuery } from '@tanstack/react-query';

import { fetchMySignatures } from '../chat.api.ts';

export function useMySignatures() {
  return useQuery({
    queryKey: ['signatures', 'mine'],
    queryFn: () => fetchMySignatures(),
  });
}
