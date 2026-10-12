import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { cancelSignature, remindAllSignatures, remindSignature } from '../signatures.api.ts';

export function useRemindSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => remindSignature(requestId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['signatures'] }),
  });
}

export function useCancelSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => cancelSignature(requestId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['signatures'] }),
  });
}

/**
 * The key is minted per attempt and held until the attempt succeeds, so a retry
 * after a timeout reuses it and cannot send a second round of reminders.
 */
export function useRemindAllSignatures() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ projectId: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (projectId: string) => {
      const pending = attempt.current;
      const key =
        pending !== null && pending.projectId === projectId ? pending.key : crypto.randomUUID();
      attempt.current = { projectId, key };
      return remindAllSignatures(projectId, key);
    },
    onSuccess: async () => {
      attempt.current = null;
      await queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });
}
