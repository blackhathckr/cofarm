import { useQuery } from '@tanstack/react-query';

import { fetchAdminDashboard } from '../dashboard.api.ts';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => fetchAdminDashboard(),
  });
}
