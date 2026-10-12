import type { CreateHarvestBody, UpdateHarvestBody } from '@cofarm/contracts/harvest';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { harvestsKey, invalidateHarvestMoney } from '../harvest-cache.ts';
import { createHarvest, fetchHarvests, updateHarvest } from '../harvest.api.ts';

export function useHarvests(projectId: string) {
  return useQuery({
    queryKey: harvestsKey(projectId),
    queryFn: () => fetchHarvests(projectId),
  });
}

export function useCreateHarvest(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateHarvestBody) => createHarvest(projectId, body),
    onSuccess: () => invalidateHarvestMoney(client, projectId),
  });
}

export function useUpdateHarvest(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { harvestId: string; body: UpdateHarvestBody }) =>
      updateHarvest(projectId, input.harvestId, input.body),
    onSuccess: () => invalidateHarvestMoney(client, projectId),
  });
}
