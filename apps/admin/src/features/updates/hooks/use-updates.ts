import type { UpdateStatus } from '@cofarm/contracts/updates';
import { useQuery } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchUpdate, fetchUpdateProject, fetchUpdates } from '../updates.api.ts';

export function useUpdates(projectId: string, status: UpdateStatus | null) {
  return useCursorList({
    queryKey: ['updates', projectId, 'list', status],
    fetchPage: (cursor) =>
      fetchUpdates(projectId, { ...(status === null ? {} : { status }), cursor }),
  });
}

export function useUpdate(projectId: string, updateId: string | null) {
  return useQuery({
    queryKey: ['updates', projectId, 'detail', updateId],
    queryFn: () => fetchUpdate(projectId, updateId ?? ''),
    enabled: updateId !== null,
  });
}

export function useUpdateProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => fetchUpdateProject(projectId),
  });
}
