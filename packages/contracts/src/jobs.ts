import { z } from 'zod';

import { timestampSchema, uuidSchema } from './primitives.ts';

export const jobStatusSchema = z.enum(['pending', 'running', 'done', 'failed']);

export const jobSchema = z.object({
  id: uuidSchema,
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: jobStatusSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  runAt: timestampSchema,
  lockedAt: timestampSchema.nullable(),
  lockedBy: z.string().nullable(),
  lastError: z.string().nullable(),
  dedupeKey: z.string().nullable(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
});

export const jobOverviewSchema = z.object({
  items: z.array(jobSchema),
  counts: z.object({
    pending: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
});

export const listJobsQuerySchema = z.object({
  status: jobStatusSchema.optional(),
  type: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobOverview = z.infer<typeof jobOverviewSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
