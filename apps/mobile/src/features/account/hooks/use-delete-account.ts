import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endSession } from '@/lib/session.ts';
import { deleteAccount } from '../account.api.ts';
import { forgetDeviceToken } from '../push-device.ts';

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAccount({ confirm: true }),
    onSuccess: async () => {
      forgetDeviceToken();
      await endSession();
      queryClient.clear();
    },
  });
}
