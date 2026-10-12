import type { CreateActivityBody } from '@cofarm/contracts/updates';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { createActivity, fetchActivity } from '../updates.api.ts';

export function useActivity(projectId: string) {
  return useCursorList({
    queryKey: ['activity', projectId],
    fetchPage: (cursor) => fetchActivity(projectId, { cursor }),
  });
}

export function useCreateActivity(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateActivityBody) => createActivity(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activity', projectId] });
    },
  });
}
