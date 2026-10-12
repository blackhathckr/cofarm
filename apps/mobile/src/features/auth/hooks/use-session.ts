import { sessionSchema } from '@cofarm/contracts/auth';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { request } from '@/lib/api-client.ts';
import { endSession, readRefreshToken, snapshot, startSession, subscribe } from '@/lib/session.ts';

export function useSession() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * The keychain survives a cold start, so a returning partner is signed back in
 * before the app decides to show the login screen.
 */
export function useRestoreSession(): { isRestoring: boolean } {
  const session = useSession();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    if (session.accessToken !== null) {
      setIsRestoring(false);
      return;
    }

    const controller = new AbortController();
    const isAborted = () => controller.signal.aborted;

    void (async () => {
      try {
        const refreshToken = await readRefreshToken();
        if (refreshToken === null || isAborted()) return;

        const restored = await request('/v1/auth/refresh', sessionSchema, {
          method: 'POST',
          body: { refreshToken },
        });
        if (isAborted()) return;
        await startSession(restored.accessToken, restored.refreshToken, restored.user);
      } catch {
        if (!isAborted()) await endSession();
      } finally {
        if (!isAborted()) setIsRestoring(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [session.accessToken]);

  return { isRestoring };
}
