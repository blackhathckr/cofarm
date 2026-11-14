import { z } from 'zod';

import { costHeadSchema } from './ledger.ts';
import { uuidSchema } from './primitives.ts';

const headNameSchema = z.string().trim().min(2).max(80);

export const expenseHeadSchema = z.object({
  id: uuidSchema,
  costHead: costHeadSchema,
  parentId: uuidSchema.nullable(),
  name: z.string(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
});

/** A sub-head inherits its parent's cost head, so it is named under a parent instead. */
export const createExpenseHeadBodySchema = z.union([
  z.object({ costHead: costHeadSchema, name: headNameSchema }),
  z.object({ parentId: uuidSchema, name: headNameSchema }),
]);

export const updateExpenseHeadBodySchema = z.object({
  name: headNameSchema.optional(),
  archived: z.boolean().optional(),
});

export const expenseHeadParamsSchema = z.object({ headId: uuidSchema });

export type ExpenseHead = z.infer<typeof expenseHeadSchema>;
export type CreateExpenseHeadBody = z.infer<typeof createExpenseHeadBodySchema>;
export type UpdateExpenseHeadBody = z.infer<typeof updateExpenseHeadBodySchema>;
export type ExpenseHeadParams = z.infer<typeof expenseHeadParamsSchema>;
