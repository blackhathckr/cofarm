import { useQuery } from '@tanstack/react-query';

import { fetchPartnerDashboard } from '../dashboard.api.ts';

export function usePartnerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'partner'],
    queryFn: fetchPartnerDashboard,
  });
}
