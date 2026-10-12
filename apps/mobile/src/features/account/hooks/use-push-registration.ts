import { useEffect } from 'react';

import { useSession } from '@/features/auth/hooks/use-session.ts';
import { registeredDeviceToken, requestDeviceToken } from '../push-device.ts';
import { useRegisterDevice } from './use-device-registration.ts';

/**
 * Mounted by the tab layout, so every signed-in partner registers once on
 * entry: a partner who never opens the account screen would otherwise never
 * receive a push. A device that refuses permission still gets its
 * notifications in-app.
 */
export function usePushRegistration(): void {
  const { accessToken } = useSession();
  const { mutate } = useRegisterDevice();

  useEffect(() => {
    if (accessToken === null || registeredDeviceToken() !== null) return;

    const controller = new AbortController();
    const isAborted = () => controller.signal.aborted;

    void (async () => {
      const device = await requestDeviceToken();
      if (device === null || isAborted()) return;
      mutate(device);
    })();

    return () => {
      controller.abort();
    };
  }, [accessToken, mutate]);
}
