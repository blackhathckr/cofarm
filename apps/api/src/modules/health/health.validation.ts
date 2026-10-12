import { z } from 'zod';

const livenessSchema = z.object({ status: z.literal('ok') });

const readinessSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
});

export const healthSchemas = {
  live: { response: { 200: livenessSchema } },
  ready: { response: { 200: readinessSchema, 503: readinessSchema } },
} as const;
