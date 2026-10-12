import { sessionSchema } from '@cofarm/contracts/auth';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { request } from '@/lib/api-client.ts';
import { endSession, readRefreshToken, snapshot, startSession, subscribe } from '@/lib/session.ts';

export function useSession() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * A reload loses the in-memory access token but keeps the refresh token, so
 * the console trades it for a fresh session before deciding to show sign-in.
 */
export function useRestoreSession(): { isRestoring: boolean } {
  const session = useSession();
  const [isRestoring, setIsRestoring] = useState(() => readRefreshToken() !== null);

  useEffect(() => {
    const refreshToken = readRefreshToken();
    if (session.accessToken !== null || refreshToken === null) {
      setIsRestoring(false);
      return;
    }

    const controller = new AbortController();
    void (async () => {
      try {
        const restored = await request('/v1/auth/refresh', sessionSchema, {
          method: 'POST',
          body: { refreshToken },
        });
        if (controller.signal.aborted) return;
        startSession(restored.accessToken, restored.refreshToken, restored.user);
      } catch {
        if (!controller.signal.aborted) endSession();
      } finally {
        if (!controller.signal.aborted) setIsRestoring(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [session.accessToken]);

  return { isRestoring };
}
