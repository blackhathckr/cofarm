import { projectPartnerSchema } from '@cofarm/contracts/partners';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { request } from './api-client.ts';

const projectPartnersSchema = z.array(projectPartnerSchema);

function fetchProjectPartners(projectId: string) {
  return request(`/v1/projects/${projectId}/partners`, projectPartnersSchema);
}

export function useProjectPartners(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'partners'],
    queryFn: () => fetchProjectPartners(projectId ?? ''),
    enabled: projectId !== null,
  });
}
