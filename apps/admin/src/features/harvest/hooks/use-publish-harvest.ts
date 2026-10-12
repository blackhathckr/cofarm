import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateHarvestMoney } from '../harvest-cache.ts';
import { publishHarvest } from '../harvest.api.ts';

export function usePublishHarvest(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { harvestId: string; idempotencyKey: string }) =>
      publishHarvest(projectId, input.harvestId, input.idempotencyKey),
    onSuccess: () => invalidateHarvestMoney(client, projectId),
  });
}
