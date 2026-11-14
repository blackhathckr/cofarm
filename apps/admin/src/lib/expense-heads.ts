import { expenseHeadSchema, type ExpenseHead } from '@cofarm/contracts/expense-heads';
import type { CostHead } from '@cofarm/core/pnl';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { request } from './api-client.ts';

export const EXPENSE_HEADS_KEY = ['expense-heads'];

function fetchExpenseHeads() {
  return request('/v1/expense-heads', z.array(expenseHeadSchema));
}

export function useExpenseHeads() {
  return useQuery({
    queryKey: EXPENSE_HEADS_KEY,
    queryFn: () => fetchExpenseHeads(),
    staleTime: 5 * 60 * 1000,
  });
}

export function topHeads(heads: readonly ExpenseHead[], costHead: CostHead): ExpenseHead[] {
  return heads.filter((head) => head.costHead === costHead && head.parentId === null);
}

export function subHeads(heads: readonly ExpenseHead[], parentId: string): ExpenseHead[] {
  return heads.filter((head) => head.parentId === parentId);
}

export function activeOnly(heads: readonly ExpenseHead[]): ExpenseHead[] {
  return heads.filter((head) => !head.archived);
}

/** "Temporary labour › Weeding", or just the head's name when it has no parent. */
export function headPath(heads: readonly ExpenseHead[], headId: string): string | null {
  const head = heads.find((candidate) => candidate.id === headId);
  if (head === undefined) return null;
  if (head.parentId === null) return head.name;

  const parent = heads.find((candidate) => candidate.id === head.parentId);
  return parent === undefined ? head.name : `${parent.name} › ${head.name}`;
}
