import { useQuery } from '@tanstack/react-query';

import { fetchHarvests } from '../harvest.api.ts';

export function useProjectHarvests(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'harvest'],
    queryFn: () => fetchHarvests(projectId ?? ''),
    enabled: projectId !== null,
  });
}
