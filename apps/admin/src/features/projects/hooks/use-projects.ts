import type { ListProjectsQuery } from '@cofarm/contracts/projects';
import { useQuery } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchProject, fetchProjects } from '../projects.api.ts';

export function useProjects(query: Partial<ListProjectsQuery> = {}) {
  return useCursorList({
    queryKey: ['projects', query],
    fetchPage: (cursor) => fetchProjects({ ...query, cursor }),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => fetchProject(projectId),
  });
}
