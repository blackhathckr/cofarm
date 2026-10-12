import { COST_HEADS } from '@cofarm/core/pnl';
import { z } from 'zod';

import {
  basisPointsSchema,
  pageOf,
  paginationQuerySchema,
  paiseSchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';
import { milestoneStageSchema, milestoneStatusSchema } from './projects.ts';

export const misSourceSchema = z.enum(['generated', 'uploaded']);
export const misStatusSchema = z.enum(['draft', 'published']);

export const misMonthSchema = z.number().int().min(1).max(12);
export const misYearSchema = z.number().int().min(2000).max(2100);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function misPeriodLabel(month: number, year: number): string {
  const name = MONTH_NAMES[month - 1];
  return name === undefined ? `${year}` : `${name} ${year}`;
}

/** The archive is keyed by period, so the page cursor is one: `2026-08`. */
export const misCursorSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

export function misCursor(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export const misReportSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  month: misMonthSchema,
  year: misYearSchema,
  label: z.string(),
  title: z.string(),
  narrative: z.string().nullable(),
  outlook: z.string().nullable(),
  source: misSourceSchema,
  documentId: uuidSchema.nullable(),
  status: misStatusSchema,
  publishedAt: timestampSchema.nullable(),
  isRead: z.boolean(),
  /** Published and still unread by the caller — the banner and the dot. */
  isNew: z.boolean(),
  createdAt: timestampSchema,
});

export const misSummarySchema = misReportSchema.pick({
  id: true,
  month: true,
  year: true,
  label: true,
  title: true,
  status: true,
  source: true,
  documentId: true,
  publishedAt: true,
  isRead: true,
  isNew: true,
});

export const misLatestSchema = misSummarySchema.extend({
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
});

export const misCostHeadSchema = z.enum(COST_HEADS);

export const misCostTotalSchema = z.object({
  head: misCostHeadSchema,
  amountPaise: paiseSchema,
});

export const misMilestoneStateSchema = z.object({
  cycleId: uuidSchema,
  cycleNo: z.number().int().positive(),
  progressBps: basisPointsSchema,
  activeStage: milestoneStageSchema.nullable(),
  activeStageLabel: z.string().nullable(),
  stages: z.array(z.object({ stage: milestoneStageSchema, status: milestoneStatusSchema })),
});

export const misFigureSourceSchema = z.enum(['cost_totals', 'update_count', 'photographs']);

export const misPhotographSchema = z.object({
  documentId: uuidSchema,
  caption: z.string().nullable(),
});

export const misComposePayloadSchema = z.object({
  reportId: uuidSchema,
  projectId: uuidSchema,
  month: misMonthSchema,
  year: misYearSchema,
  label: z.string(),
  narrative: z.string().nullable(),
  outlook: z.string().nullable(),
  /** False when the admin had already written their own words, which stand. */
  narrativeStored: z.boolean(),
  outlookStored: z.boolean(),
  costs: z.object({
    cycleId: uuidSchema.nullable(),
    cycleNo: z.number().int().positive().nullable(),
    totalPaise: paiseSchema,
    byHead: z.array(misCostTotalSchema),
  }),
  updateCount: z.number().int().nonnegative(),
  milestone: misMilestoneStateSchema.nullable(),
  /** The month's farm photographs, capped to what a report can carry. */
  photographs: z.array(misPhotographSchema),
  /** Figures whose owning module is not wired in yet; they read as zero. */
  unavailableFigures: z.array(misFigureSourceSchema),
});

export const createMisBodySchema = z.object({
  month: misMonthSchema,
  year: misYearSchema,
  title: z.string().min(2).max(160),
  narrative: z.string().max(8000).optional(),
  outlook: z.string().max(8000).optional(),
  source: misSourceSchema,
  documentId: uuidSchema.optional(),
});

export const updateMisBodySchema = z.object({
  title: z.string().min(2).max(160).optional(),
  narrative: z.string().max(8000).nullable().optional(),
  outlook: z.string().max(8000).nullable().optional(),
  documentId: uuidSchema.nullable().optional(),
});

export const listMisQuerySchema = paginationQuerySchema.extend({
  cursor: misCursorSchema.optional(),
});

export const misReportParamsSchema = z.object({
  projectId: uuidSchema,
  reportId: uuidSchema,
});

export const misPageSchema = pageOf(misSummarySchema);

export type MisReport = z.infer<typeof misReportSchema>;
export type MisSummary = z.infer<typeof misSummarySchema>;
export type MisLatest = z.infer<typeof misLatestSchema>;
export type MisPage = z.infer<typeof misPageSchema>;
export type MisSource = z.infer<typeof misSourceSchema>;
export type MisStatus = z.infer<typeof misStatusSchema>;
export type MisCostHead = z.infer<typeof misCostHeadSchema>;
export type MisCostTotal = z.infer<typeof misCostTotalSchema>;
export type MisMilestoneState = z.infer<typeof misMilestoneStateSchema>;
export type MisFigureSource = z.infer<typeof misFigureSourceSchema>;
export type MisPhotograph = z.infer<typeof misPhotographSchema>;
export type MisComposePayload = z.infer<typeof misComposePayloadSchema>;
export type CreateMisBody = z.infer<typeof createMisBodySchema>;
export type UpdateMisBody = z.infer<typeof updateMisBodySchema>;
export type ListMisQuery = z.infer<typeof listMisQuerySchema>;
export type MisReportParams = z.infer<typeof misReportParamsSchema>;
