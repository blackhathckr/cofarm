import { useMutation } from '@tanstack/react-query';

import { startSession } from '@/lib/session.ts';
import { signInAdmin, type AdminCredentials } from '../auth.api.ts';

export function useSignIn() {
  return useMutation({
    mutationFn: (credentials: AdminCredentials) => signInAdmin(credentials),
    onSuccess: (session) => {
      startSession(session.accessToken, session.refreshToken, session.user);
    },
  });
}
