import { ERROR_CODES } from '@cofarm/contracts/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { ApiError } from '@/lib/api-client.ts';
import { signDocument } from '../chat.api.ts';

type SignRequest = {
  requestId: string;
  signedName: string;
};

/**
 * The key is minted per attempt and held until the attempt settles, so a retry
 * after a timeout reuses it and cannot record a second signature. A request the
 * server already settled is signed: refresh rather than send again.
 */
export function useSignDocument() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ requestId: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (signature: SignRequest) => {
      const pending = attempt.current;
      const key =
        pending !== null && pending.requestId === signature.requestId
          ? pending.key
          : crypto.randomUUID();
      attempt.current = { requestId: signature.requestId, key };

      return signDocument(signature.requestId, signature.signedName, key);
    },
    onSuccess: async () => {
      attempt.current = null;
      await queryClient.invalidateQueries({ queryKey: ['signatures', 'mine'] });
    },
    onError: async (failure) => {
      if (!(failure instanceof ApiError) || failure.code !== ERROR_CODES.signatureAlreadySettled) {
        return;
      }
      attempt.current = null;
      await queryClient.invalidateQueries({ queryKey: ['signatures', 'mine'] });
    },
  });
}
