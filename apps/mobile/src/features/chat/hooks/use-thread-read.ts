import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { markThreadRead } from '../chat.api.ts';

/** Opening the conversation is what clears the partner's unread count. */
export function useThreadRead(projectId: string | null): void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (openedProjectId: string) => markThreadRead(openedProjectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['threads', 'mine'] });
    },
  });

  useEffect(() => {
    if (projectId === null) return;
    mutate(projectId);
  }, [projectId, mutate]);
}
