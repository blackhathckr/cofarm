import {
  expenseHeadSchema,
  type CreateExpenseHeadBody,
  type UpdateExpenseHeadBody,
} from '@cofarm/contracts/expense-heads';

import { request } from '@/lib/api-client.ts';

export function createExpenseHead(body: CreateExpenseHeadBody) {
  return request('/v1/expense-heads', expenseHeadSchema, { method: 'POST', body });
}

export function updateExpenseHead(headId: string, body: UpdateExpenseHeadBody) {
  return request(`/v1/expense-heads/${headId}`, expenseHeadSchema, { method: 'PATCH', body });
}
