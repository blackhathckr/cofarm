import { projectPageSchema } from '@cofarm/contracts/projects';
import { useQuery } from '@tanstack/react-query';

import { request } from './api-client.ts';

function fetchProjectOptions() {
  return request('/v1/projects?limit=100', projectPageSchema);
}

export function useProjectOptions() {
  return useQuery({
    queryKey: ['projects', 'options'],
    queryFn: () => fetchProjectOptions(),
  });
}
