import { z } from 'zod';

import {
  dateSchema,
  pageOf,
  paginationQuerySchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';
import { entityTypeSchema } from './tracking.ts';

export const notificationTypeSchema = z.enum([
  'mis_published',
  'update_published',
  'harvest_published',
  'message_received',
  'document_issued',
  'reminder',
]);

export const devicePlatformSchema = z.enum(['ios', 'android']);

export const notificationSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema.nullable(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  entityType: entityTypeSchema.nullable(),
  entityId: uuidSchema.nullable(),
  payload: z.record(z.string(), z.string()),
  readAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
});

export const notificationPageSchema = pageOf(notificationSchema).extend({
  unreadCount: z.number().int().nonnegative(),
});

/** The cursor is the last id of the previous page, so it is a uuid, not free text. */
export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  cursor: uuidSchema.optional(),
  /** One Indian calendar day. Omitted reads every day, newest first. */
  date: dateSchema.optional(),
});

export const notificationIdParamsSchema = z.object({ notificationId: uuidSchema });

export const readAllResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export const deviceSchema = z.object({
  id: uuidSchema,
  token: z.string(),
  platform: devicePlatformSchema,
  lastSeenAt: timestampSchema,
  createdAt: timestampSchema,
});

export const registerDeviceBodySchema = z.object({
  token: z.string().min(8).max(4096),
  platform: devicePlatformSchema,
});

export const deviceTokenParamsSchema = z.object({ token: z.string().min(8).max(4096) });

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type ReadAllResult = z.infer<typeof readAllResultSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;
export type RegisterDeviceBody = z.infer<typeof registerDeviceBodySchema>;
