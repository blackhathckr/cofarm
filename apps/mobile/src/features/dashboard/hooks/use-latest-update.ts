import { useQuery } from '@tanstack/react-query';

import { fetchLatestUpdate } from '../dashboard.api.ts';

export function useLatestUpdate(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'updates', 'latest'],
    queryFn: () => fetchLatestUpdate(projectId ?? ''),
    enabled: projectId !== null,
  });
}
