import { useQuery } from '@tanstack/react-query';

import { harvestPreviewKey } from '../harvest-cache.ts';
import { fetchHarvestPreview } from '../harvest.api.ts';

export function useHarvestPreview(projectId: string, harvestId: string) {
  return useQuery({
    queryKey: harvestPreviewKey(projectId, harvestId),
    queryFn: () => fetchHarvestPreview(projectId, harvestId),
    // Money about to be committed is never served from a warm cache.
    staleTime: 0,
  });
}
