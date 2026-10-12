import { COST_HEADS } from '@cofarm/core/pnl';
import { z } from 'zod';

import {
  dateSchema,
  pageOf,
  paginationQuerySchema,
  paiseSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const costHeadSchema = z.enum(COST_HEADS);

export const ledgerTypeSchema = z.enum([
  'contribution',
  'expense',
  'revenue',
  'payout',
  'adjustment',
]);

/** An entry carries the magnitude of a movement, never its sign: a correction
 * is a reversing entry rather than a negative amount. */
export const positivePaiseSchema = paiseSchema.refine(
  (amount) => BigInt(amount) > 0n,
  'Expected an amount greater than zero',
);

export const ledgerEntrySchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  cycleId: uuidSchema.nullable(),
  membershipId: uuidSchema.nullable(),
  type: ledgerTypeSchema,
  costHead: costHeadSchema.nullable(),
  amountPaise: paiseSchema,
  entryDate: dateSchema,
  note: z.string().nullable(),
  documentId: uuidSchema.nullable(),
  reversesId: uuidSchema.nullable(),
  reversedByEntryId: uuidSchema.nullable(),
  createdAt: timestampSchema,
});

/** Heads with no spend are omitted rather than sent as zero. */
export const costTotalsSchema = z.partialRecord(costHeadSchema, paiseSchema);

export const membershipTotalSchema = z.object({
  membershipId: uuidSchema,
  totalPaise: paiseSchema,
});

export const expensePageSchema = pageOf(ledgerEntrySchema).extend({
  totalsByHead: costTotalsSchema,
  totalPaise: paiseSchema,
});

export const contributionPageSchema = pageOf(ledgerEntrySchema).extend({
  totalsByMembership: z.array(membershipTotalSchema),
  totalPaise: paiseSchema,
});

export const ledgerSummarySchema = z.object({
  projectId: uuidSchema,
  cycleId: uuidSchema.nullable(),
  grossRevenuePaise: paiseSchema,
  totalCostPaise: paiseSchema,
  costsByHead: costTotalsSchema,
  netProceedsPaise: paiseSchema,
  contributionsPaise: paiseSchema,
  payoutsPaise: paiseSchema,
});

export const recordExpenseBodySchema = z.object({
  cycleId: uuidSchema.optional(),
  costHead: costHeadSchema,
  amountPaise: positivePaiseSchema,
  entryDate: dateSchema,
  note: z.string().min(1).max(500).optional(),
  documentId: uuidSchema.optional(),
});

export const reverseExpenseBodySchema = z.object({
  note: z.string().min(3).max(500),
});

export const reverseContributionBodySchema = z.object({
  note: z.string().min(3).max(500),
});

export const recordContributionBodySchema = z.object({
  membershipId: uuidSchema,
  amountPaise: positivePaiseSchema,
  entryDate: dateSchema,
  note: z.string().min(1).max(500).optional(),
  documentId: uuidSchema.optional(),
});

export const recordRevenueBodySchema = z.object({
  cycleId: uuidSchema,
  amountPaise: positivePaiseSchema,
  entryDate: dateSchema,
  buyerNote: z.string().min(1).max(500).optional(),
  documentId: uuidSchema.optional(),
});

export const listExpensesQuerySchema = paginationQuerySchema.extend({
  cycleId: uuidSchema.optional(),
  costHead: costHeadSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const listContributionsQuerySchema = paginationQuerySchema.extend({
  membershipId: uuidSchema.optional(),
  cycleId: uuidSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const ledgerSummaryQuerySchema = z.object({ cycleId: uuidSchema.optional() });

export const ledgerEntryParamsSchema = z.object({
  projectId: uuidSchema,
  entryId: uuidSchema,
});

export type LedgerType = z.infer<typeof ledgerTypeSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type CostTotals = z.infer<typeof costTotalsSchema>;
export type MembershipTotal = z.infer<typeof membershipTotalSchema>;
export type ExpensePage = z.infer<typeof expensePageSchema>;
export type ContributionPage = z.infer<typeof contributionPageSchema>;
export type LedgerSummary = z.infer<typeof ledgerSummarySchema>;
export type RecordExpenseBody = z.infer<typeof recordExpenseBodySchema>;
export type ReverseExpenseBody = z.infer<typeof reverseExpenseBodySchema>;
export type ReverseContributionBody = z.infer<typeof reverseContributionBodySchema>;
export type RecordContributionBody = z.infer<typeof recordContributionBodySchema>;
export type RecordRevenueBody = z.infer<typeof recordRevenueBodySchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type ListContributionsQuery = z.infer<typeof listContributionsQuerySchema>;
export type LedgerSummaryQuery = z.infer<typeof ledgerSummaryQuerySchema>;
export type LedgerEntryParams = z.infer<typeof ledgerEntryParamsSchema>;
