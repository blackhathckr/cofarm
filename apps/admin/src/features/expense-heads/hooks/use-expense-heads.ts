import type { CreateExpenseHeadBody, UpdateExpenseHeadBody } from '@cofarm/contracts/expense-heads';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { EXPENSE_HEADS_KEY } from '@/lib/expense-heads.ts';
import { createExpenseHead, updateExpenseHead } from '../expense-heads.api.ts';

export function useCreateExpenseHead() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateExpenseHeadBody) => createExpenseHead(body),
    onSuccess: () => client.invalidateQueries({ queryKey: EXPENSE_HEADS_KEY }),
  });
}

export function useUpdateExpenseHead() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ headId, body }: { headId: string; body: UpdateExpenseHeadBody }) =>
      updateExpenseHead(headId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: EXPENSE_HEADS_KEY }),
  });
}
