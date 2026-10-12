import { partnerDashboardSchema } from '@cofarm/contracts/dashboard';
import { misLatestSchema } from '@cofarm/contracts/mis';
import { updateFeedPageSchema } from '@cofarm/contracts/updates';
import { z } from 'zod';

import { request } from '@/lib/api-client.ts';

export function fetchPartnerDashboard() {
  return request('/v1/dashboard/partner', partnerDashboardSchema);
}

/** One entry per project the partner can reach, newest publication first. */
export function fetchLatestMisReports() {
  return request('/v1/me/mis/latest', z.array(misLatestSchema));
}

export async function fetchLatestUpdate(projectId: string) {
  const page = await request(
    `/v1/projects/${projectId}/updates/feed?limit=1`,
    updateFeedPageSchema,
  );
  return page.items[0] ?? null;
}
