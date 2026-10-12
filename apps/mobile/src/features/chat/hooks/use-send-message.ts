import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendThreadMessage } from '../chat.api.ts';

export function useSendMessage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => sendThreadMessage(projectId ?? '', { body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
