import {
  remindUnreadResultSchema,
  type RemindUnreadBody,
  type RemindUnreadResult,
} from '@cofarm/contracts/tracking';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from './api-client.ts';
import { useIdempotencyKey } from './idempotency-key.ts';

export function useRemindUnread() {
  const queryClient = useQueryClient();
  const keyFor = useIdempotencyKey();

  return useMutation<RemindUnreadResult, Error, RemindUnreadBody>({
    mutationFn: (body) =>
      request('/v1/tracking/remind-all', remindUnreadResultSchema, {
        method: 'POST',
        body,
        idempotencyKey: keyFor(`${body.entityType}:${body.entityId}`),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mis'] });
    },
  });
}

export function remindOutcome(outcome: RemindUnreadResult): string {
  const parts = [`Reminded ${outcome.reminded.toString()}`];
  if (outcome.alreadyRead > 0) {
    parts.push(`${outcome.alreadyRead.toString()} had already opened it`);
  }
  if (outcome.recentlyReminded > 0) {
    parts.push(`${outcome.recentlyReminded.toString()} were reminded recently`);
  }
  return `${parts.join(' · ')}.`;
}
