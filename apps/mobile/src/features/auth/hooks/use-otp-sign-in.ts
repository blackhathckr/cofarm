import { useMutation } from '@tanstack/react-query';

import { startSession } from '@/lib/session.ts';
import { requestOtp, verifyOtp } from '../auth.api.ts';

export function useRequestOtp() {
  return useMutation({
    mutationFn: (mobile: string) => requestOtp({ mobile }),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (input: { challengeId: string; code: string }) => verifyOtp(input),
    onSuccess: async (session) => {
      await startSession(session.accessToken, session.refreshToken, session.user);
    },
  });
}
