import {
  createExpenseHeadBodySchema,
  expenseHeadParamsSchema,
  expenseHeadSchema,
  updateExpenseHeadBodySchema,
} from '@cofarm/contracts/expense-heads';
import { z } from 'zod';

export const expenseHeadSchemas = {
  list: {
    response: { 200: z.array(expenseHeadSchema) },
  },
  create: {
    body: createExpenseHeadBodySchema,
    response: { 201: expenseHeadSchema },
  },
  update: {
    params: expenseHeadParamsSchema,
    body: updateExpenseHeadBodySchema,
    response: { 200: expenseHeadSchema },
  },
} as const;
