import { useQuery } from '@tanstack/react-query';

import { fetchCycleStatement } from '../harvest.api.ts';

export function useCycleStatement(projectId: string, cycleId: string, membershipId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'cycles', cycleId, 'statement', membershipId],
    queryFn: () => fetchCycleStatement(projectId, cycleId, membershipId),
  });
}
