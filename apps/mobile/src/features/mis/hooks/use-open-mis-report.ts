import { useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchMisReport } from '../mis.api.ts';

/**
 * Reading the detail is what records the partner's read receipt, so it runs on
 * open rather than when the archive renders.
 */
export function useOpenMisReport(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => fetchMisReport(projectId ?? '', reportId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'mis'] });
    },
  });
}
