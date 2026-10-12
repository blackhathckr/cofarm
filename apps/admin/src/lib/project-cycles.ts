import { cycleSchema } from '@cofarm/contracts/projects';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { request } from './api-client.ts';

const cyclesSchema = z.array(cycleSchema);

function fetchProjectCycles(projectId: string) {
  return request(`/v1/projects/${projectId}/cycles`, cyclesSchema);
}

export function useProjectCycles(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'cycles'],
    queryFn: () => fetchProjectCycles(projectId),
  });
}
