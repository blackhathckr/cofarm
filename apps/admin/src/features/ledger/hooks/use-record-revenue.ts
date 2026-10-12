import type { RecordRevenueBody } from '@cofarm/contracts/ledger';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateProjectMoney } from '../ledger-cache.ts';
import { recordRevenue } from '../ledger.api.ts';

export function useRecordRevenue(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (body: RecordRevenueBody) => recordRevenue(projectId, body),
    onSuccess: () => invalidateProjectMoney(client, projectId),
  });
}
