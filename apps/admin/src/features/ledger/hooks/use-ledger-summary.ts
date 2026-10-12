import { useQuery } from '@tanstack/react-query';

import { ledgerSummaryKey } from '../ledger-cache.ts';
import { fetchLedgerSummary } from '../ledger.api.ts';

export function useLedgerSummary(projectId: string, cycleId?: string) {
  return useQuery({
    queryKey: [...ledgerSummaryKey(projectId), cycleId ?? null],
    queryFn: () => fetchLedgerSummary(projectId, cycleId),
  });
}
