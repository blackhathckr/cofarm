import { useQuery } from '@tanstack/react-query';

import { fetchCycleStatement } from '../harvest.api.ts';

export function useCycleStatement(projectId: string | null, cycleId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'cycles', cycleId, 'statement'],
    queryFn: () => fetchCycleStatement(projectId ?? '', cycleId ?? ''),
    enabled: projectId !== null && cycleId !== null,
  });
}
