import { z } from 'zod';

import { timestampSchema, uuidSchema } from './primitives.ts';

export const entityTypeSchema = z.enum([
  'mis_report',
  'project_update',
  'partner_statement',
  'harvest',
  'message',
  'document',
]);

export const receiptRecipientSchema = z.object({
  userId: uuidSchema,
  name: z.string(),
  isRead: z.boolean(),
  readAt: timestampSchema.nullable(),
});

export const entityReceiptsSchema = z.object({
  projectId: uuidSchema,
  entityType: entityTypeSchema,
  entityId: uuidSchema,
  totalCount: z.number().int().nonnegative(),
  readCount: z.number().int().nonnegative(),
  recipients: z.array(receiptRecipientSchema),
});

/**
 * Only the artefacts the tracking screen reports receipts for. Narrower than
 * `entityTypeSchema` on purpose: a reminder is an action on an artefact a
 * partner was addressed with, not a general notify-anyone call.
 */
export const remindableEntityTypeSchema = z.enum(['mis_report', 'project_update']);

export const remindUnreadBodySchema = z.object({
  projectId: uuidSchema,
  entityType: remindableEntityTypeSchema,
  entityId: uuidSchema,
});

export const remindUnreadResultSchema = z.object({
  projectId: uuidSchema,
  entityType: remindableEntityTypeSchema,
  entityId: uuidSchema,
  reminded: z.number().int().nonnegative(),
  alreadyRead: z.number().int().nonnegative(),
  recentlyReminded: z.number().int().nonnegative(),
});

export const receiptsQuerySchema = z.object({
  projectId: uuidSchema,
  entityType: entityTypeSchema,
  entityId: uuidSchema,
});

export type EntityType = z.infer<typeof entityTypeSchema>;
export type ReceiptRecipient = z.infer<typeof receiptRecipientSchema>;
export type EntityReceipts = z.infer<typeof entityReceiptsSchema>;
export type ReceiptsQuery = z.infer<typeof receiptsQuerySchema>;
export type RemindableEntityType = z.infer<typeof remindableEntityTypeSchema>;
export type RemindUnreadBody = z.infer<typeof remindUnreadBodySchema>;
export type RemindUnreadResult = z.infer<typeof remindUnreadResultSchema>;
