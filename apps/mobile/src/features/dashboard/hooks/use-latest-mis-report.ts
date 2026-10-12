import { useQuery } from '@tanstack/react-query';

import { fetchLatestMisReports } from '../dashboard.api.ts';

export function useLatestMisReport(projectId: string | null) {
  return useQuery({
    queryKey: ['me', 'mis', 'latest'],
    queryFn: fetchLatestMisReports,
    enabled: projectId !== null,
    select: (reports) => reports.find((report) => report.projectId === projectId) ?? null,
  });
}
