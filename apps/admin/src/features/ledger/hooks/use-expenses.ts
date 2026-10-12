import type { RecordExpenseBody, ReverseExpenseBody } from '@cofarm/contracts/ledger';
import type { CostHead } from '@cofarm/core/pnl';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { invalidateProjectMoney, expensesKey } from '../ledger-cache.ts';
import { fetchExpenses, recordExpense, reverseExpense } from '../ledger.api.ts';

export type ExpenseFilters = {
  cycleId?: string;
  costHead?: CostHead;
  from?: string;
  to?: string;
};

export function useExpenses(projectId: string, filters: ExpenseFilters) {
  return useCursorList({
    queryKey: [...expensesKey(projectId), filters],
    fetchPage: (cursor) => fetchExpenses(projectId, { ...filters, cursor }),
  });
}

export function useRecordExpense(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (body: RecordExpenseBody) => recordExpense(projectId, body),
    onSuccess: () => invalidateProjectMoney(client, projectId),
  });
}

export function useReverseExpense(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { entryId: string; body: ReverseExpenseBody }) =>
      reverseExpense(projectId, input.entryId, input.body),
    onSuccess: () => invalidateProjectMoney(client, projectId),
  });
}
