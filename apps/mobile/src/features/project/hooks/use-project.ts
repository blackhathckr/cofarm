import { useQuery } from '@tanstack/react-query';

import { fetchProject } from '../project.api.ts';

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => fetchProject(projectId ?? ''),
    enabled: projectId !== null,
  });
}
