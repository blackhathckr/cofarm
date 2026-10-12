import { z } from 'zod';

import { costTotalsSchema, positivePaiseSchema } from './ledger.ts';
import {
  basisPointsSchema,
  dateSchema,
  pageOf,
  paginationQuerySchema,
  paiseSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

/**
 * Weight crosses the wire as a decimal string. The column holds two decimal
 * places and a float would not round-trip them, which would then move money:
 * gross revenue is the yield times the realised price.
 */
export const kilogramsSchema = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Expected kilograms as a decimal string, up to two places');

export const positiveKilogramsSchema = kilogramsSchema.refine(
  (kilograms) => /[1-9]/.test(kilograms),
  'Expected kilograms greater than zero',
);

export const harvestStatusSchema = z.enum(['draft', 'published']);

export const varietySplitSchema = z
  .record(z.string().min(1).max(80), positiveKilogramsSchema)
  .refine((split) => Object.keys(split).length > 0, 'Name at least one variety');

const varietySplitOutSchema = z.record(z.string(), kilogramsSchema);

export const harvestSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  cycleId: uuidSchema,
  cycleNo: z.number().int().positive(),
  yieldKg: kilogramsSchema,
  varietySplit: varietySplitOutSchema,
  pricePerKgPaise: paiseSchema,
  buyer: z.string(),
  grossRevenuePaise: paiseSchema,
  harvestedOn: dateSchema,
  status: harvestStatusSchema,
  // Ids only: the client asks the documents module for a signed URL when it is
  // about to render one.
  weighmentSlipDocumentIds: z.array(uuidSchema),
  harvestPhotoDocumentIds: z.array(uuidSchema),
  publishedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
});

export const harvestShareSchema = z.object({
  membershipId: uuidSchema,
  partnerId: uuidSchema,
  name: z.string(),
  contributionPaise: paiseSchema,
  sharePaise: paiseSchema,
  returnBps: z.number().int(),
});

export const harvestPreviewSchema = z.object({
  harvestId: uuidSchema,
  projectId: uuidSchema,
  cycleId: uuidSchema,
  cycleNo: z.number().int().positive(),
  status: harvestStatusSchema,
  grossRevenuePaise: paiseSchema,
  costsByHead: costTotalsSchema,
  totalCostPaise: paiseSchema,
  netProceedsPaise: paiseSchema,
  kiaanShareBps: basisPointsSchema,
  kiaanSharePaise: paiseSchema,
  partnerPoolPaise: paiseSchema,
  partners: z.array(harvestShareSchema),
});

export const partnerStatementSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: z.string(),
  projectName: z.string(),
  cycleId: uuidSchema,
  cycleNo: z.number().int().positive(),
  membershipId: uuidSchema,
  partnerName: z.string(),
  yieldKg: kilogramsSchema,
  varietySplit: varietySplitOutSchema,
  pricePerKgPaise: paiseSchema,
  buyer: z.string(),
  harvestedOn: dateSchema,
  grossRevenuePaise: paiseSchema,
  costsByHead: costTotalsSchema,
  totalCostPaise: paiseSchema,
  netProceedsPaise: paiseSchema,
  kiaanShareBps: basisPointsSchema,
  kiaanSharePaise: paiseSchema,
  partnerPoolPaise: paiseSchema,
  sharePaise: paiseSchema,
  contributionPaise: paiseSchema,
  cumulativeSharePaise: paiseSchema,
  returnBps: z.number().int(),
  generatedAt: timestampSchema,
});

export const statementTotalsSchema = z.object({
  totalContributedPaise: paiseSchema,
  totalEarnedPaise: paiseSchema,
  returnBps: z.number().int(),
});

/** Totals span every statement the caller holds, not just the page. */
export const myStatementsSchema = pageOf(partnerStatementSchema).extend({
  totals: statementTotalsSchema,
});

export const payoutResultSchema = z.object({
  cycleId: uuidSchema,
  recordedCount: z.number().int().nonnegative(),
  totalPaise: paiseSchema,
});

/** Gross revenue is computed from yield and price, never accepted from a client. */
export const createHarvestBodySchema = z.object({
  cycleId: uuidSchema,
  yieldKg: positiveKilogramsSchema,
  varietySplit: varietySplitSchema,
  pricePerKgPaise: positivePaiseSchema,
  buyer: z.string().min(2).max(160),
  harvestedOn: dateSchema,
  weighmentSlipDocumentIds: z.array(uuidSchema).max(20).optional(),
  harvestPhotoDocumentIds: z.array(uuidSchema).max(60).optional(),
});

export const updateHarvestBodySchema = createHarvestBodySchema.omit({ cycleId: true }).partial();

export const recordPayoutsBodySchema = z.object({
  entryDate: dateSchema,
  note: z.string().min(1).max(500).optional(),
});

export const harvestParamsSchema = z.object({
  projectId: uuidSchema,
  harvestId: uuidSchema,
});

export const cycleStatementParamsSchema = z.object({
  projectId: uuidSchema,
  cycleId: uuidSchema,
});

export const statementQuerySchema = z.object({ membershipId: uuidSchema.optional() });

export const myStatementsQuerySchema = paginationQuerySchema;

export type Harvest = z.infer<typeof harvestSchema>;
export type HarvestStatus = z.infer<typeof harvestStatusSchema>;
export type HarvestShare = z.infer<typeof harvestShareSchema>;
export type HarvestPreview = z.infer<typeof harvestPreviewSchema>;
export type PartnerStatement = z.infer<typeof partnerStatementSchema>;
export type StatementTotals = z.infer<typeof statementTotalsSchema>;
export type MyStatements = z.infer<typeof myStatementsSchema>;
export type MyStatementsQuery = z.infer<typeof myStatementsQuerySchema>;
export type PayoutResult = z.infer<typeof payoutResultSchema>;
export type CreateHarvestBody = z.infer<typeof createHarvestBodySchema>;
export type UpdateHarvestBody = z.infer<typeof updateHarvestBodySchema>;
export type RecordPayoutsBody = z.infer<typeof recordPayoutsBodySchema>;
export type HarvestParams = z.infer<typeof harvestParamsSchema>;
export type CycleStatementParams = z.infer<typeof cycleStatementParamsSchema>;
export type StatementQuery = z.infer<typeof statementQuerySchema>;
export type VarietySplit = z.infer<typeof varietySplitOutSchema>;
