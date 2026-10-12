import { useMutation, useQueryClient } from '@tanstack/react-query';

import { endSession } from '@/lib/session.ts';
import { unregisterDevice } from '../account.api.ts';
import { forgetDeviceToken, registeredDeviceToken } from '../push-device.ts';

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = registeredDeviceToken();
      if (token !== null) {
        // Signing out must not be blocked by a devices endpoint we cannot reach;
        // the token is kept so a later sign-out can withdraw it.
        const isWithdrawn = await unregisterDevice(token).then(
          () => true,
          () => false,
        );
        if (isWithdrawn) forgetDeviceToken();
      }

      await endSession();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
