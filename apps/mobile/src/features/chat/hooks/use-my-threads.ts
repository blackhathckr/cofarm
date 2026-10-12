import { useQuery } from '@tanstack/react-query';

import { fetchMyThreads } from '../chat.api.ts';

export function useMyThreads() {
  return useQuery({
    queryKey: ['threads', 'mine'],
    queryFn: () => fetchMyThreads(),
    refetchInterval: 30_000,
  });
}
