import type { RecordPayoutsBody } from '@cofarm/contracts/harvest';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateHarvestMoney } from '../harvest-cache.ts';
import { recordPayouts } from '../harvest.api.ts';

export function useRecordPayouts(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { harvestId: string; body: RecordPayoutsBody; idempotencyKey: string }) =>
      recordPayouts(projectId, input.harvestId, input.body, input.idempotencyKey),
    onSuccess: () => invalidateHarvestMoney(client, projectId),
  });
}
