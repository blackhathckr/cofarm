import { useQuery } from '@tanstack/react-query';

import { fetchDeletionPolicy } from '../account.api.ts';

/** Fetched rather than written into the app: the policy is the server's words. */
export function useDeletionPolicy(isAsked: boolean) {
  return useQuery({
    queryKey: ['me', 'deletion-policy'],
    queryFn: () => fetchDeletionPolicy(),
    enabled: isAsked,
  });
}
