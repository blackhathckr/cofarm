import { useQuery } from '@tanstack/react-query';

import { fetchProjectCycles } from '../harvest.api.ts';

export function useProjectCycles(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'cycles'],
    queryFn: () => fetchProjectCycles(projectId ?? ''),
    enabled: projectId !== null,
  });
}
