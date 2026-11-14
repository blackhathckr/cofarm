import { z } from 'zod';

import {
  pageOf,
  paginationQuerySchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const misStatusSchema = z.enum(['draft', 'published']);

/** Quarters of the Indian financial year: Q1 is April to June. */
export const misQuarterSchema = z.number().int().min(1).max(4);
/** The calendar year the financial year starts in: 2026 is FY26-27. */
export const misYearSchema = z.number().int().min(2000).max(2100);

export type MisPeriod = { year: number; quarter: number };

export function financialYearLabel(year: number): string {
  const start = (year % 100).toString().padStart(2, '0');
  const end = ((year + 1) % 100).toString().padStart(2, '0');
  return `FY${start}-${end}`;
}

export function misPeriodLabel(quarter: number, year: number): string {
  return `Q${quarter.toString()} ${financialYearLabel(year)}`;
}

/** `month` is 1 to 12. */
export function misPeriodOf(calendarYear: number, month: number): MisPeriod {
  if (month < 4) return { year: calendarYear - 1, quarter: 4 };
  return { year: calendarYear, quarter: Math.floor((month - 4) / 3) + 1 };
}

/** The calendar year and month (1 to 12) the quarter opens with. */
export function misPeriodStart(period: MisPeriod): { calendarYear: number; month: number } {
  if (period.quarter === 4) return { calendarYear: period.year + 1, month: 1 };
  return { calendarYear: period.year, month: 4 + (period.quarter - 1) * 3 };
}

export function previousMisPeriod(period: MisPeriod): MisPeriod {
  if (period.quarter === 1) return { year: period.year - 1, quarter: 4 };
  return { year: period.year, quarter: period.quarter - 1 };
}

export function nextMisPeriod(period: MisPeriod): MisPeriod {
  if (period.quarter === 4) return { year: period.year + 1, quarter: 1 };
  return { year: period.year, quarter: period.quarter + 1 };
}

/** The archive is keyed by period, so the page cursor is one: `2026-3`. */
export const misCursorSchema = z.string().regex(/^\d{4}-[1-4]$/, 'Expected YYYY-Q');

export function misCursor(year: number, quarter: number): string {
  return `${year.toString()}-${quarter.toString()}`;
}

export const misReportSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  quarter: misQuarterSchema,
  year: misYearSchema,
  label: z.string(),
  title: z.string(),
  documentId: uuidSchema,
  status: misStatusSchema,
  publishedAt: timestampSchema.nullable(),
  isRead: z.boolean(),
  /** Published and still unread by the caller — the banner and the dot. */
  isNew: z.boolean(),
  createdAt: timestampSchema,
});

export const misSummarySchema = misReportSchema.omit({ projectId: true, createdAt: true });

export const misLatestSchema = misSummarySchema.extend({
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
});

export const createMisBodySchema = z.object({
  quarter: misQuarterSchema,
  year: misYearSchema,
  title: z.string().min(2).max(160),
  documentId: uuidSchema,
});

export const updateMisBodySchema = z.object({
  title: z.string().min(2).max(160).optional(),
  documentId: uuidSchema.optional(),
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
export type MisStatus = z.infer<typeof misStatusSchema>;
export type CreateMisBody = z.infer<typeof createMisBodySchema>;
export type UpdateMisBody = z.infer<typeof updateMisBodySchema>;
export type ListMisQuery = z.infer<typeof listMisQuerySchema>;
export type MisReportParams = z.infer<typeof misReportParamsSchema>;
