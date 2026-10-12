import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { endSession, readRefreshToken } from '@/lib/session.ts';
import { signOut } from '../auth.api.ts';

/**
 * Revokes the refresh token before clearing it. Dropping it locally alone
 * leaves a token that still mints access tokens for its full lifetime, which
 * on a shared office machine is a signed-in session nobody can see.
 */
export function useSignOut(): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const refreshToken = readRefreshToken();

    // The session ends either way: a partner who cannot reach the API must
    // still be able to leave the console.
    if (refreshToken !== null) {
      void signOut(refreshToken).catch(() => undefined);
    }

    endSession();
    queryClient.clear();
  }, [queryClient]);
}
