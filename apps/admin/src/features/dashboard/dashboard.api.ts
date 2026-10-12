import { adminDashboardSchema } from '@cofarm/contracts/dashboard';

import { request } from '@/lib/api-client.ts';

export function fetchAdminDashboard() {
  return request('/v1/dashboard/admin', adminDashboardSchema);
}
