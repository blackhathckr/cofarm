import { misPageSchema, misReportSchema } from '@cofarm/contracts/mis';

import { request } from '@/lib/api-client.ts';

export function fetchMisPage(projectId: string, cursor: string | null) {
  const query = cursor === null ? '' : `?cursor=${encodeURIComponent(cursor)}`;
  return request(`/v1/projects/${projectId}/mis${query}`, misPageSchema);
}

export function fetchMisReport(projectId: string, reportId: string) {
  return request(`/v1/projects/${projectId}/mis/${reportId}`, misReportSchema);
}
