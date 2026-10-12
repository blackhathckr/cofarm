import { z } from 'zod';

import {
  pageOf,
  paginationQuerySchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const threadStatusSchema = z.enum(['open', 'resolved']);

export const messageSenderKindSchema = z.enum(['partner', 'admin']);

export const MAX_MESSAGE_LENGTH = 4000;

export const messageSchema = z.object({
  id: uuidSchema,
  threadId: uuidSchema,
  senderUserId: uuidSchema,
  senderName: z.string(),
  senderKind: messageSenderKindSchema,
  body: z.string(),
  documentId: uuidSchema.nullable(),
  documentName: z.string().nullable(),
  sentAt: timestampSchema,
  readAt: timestampSchema.nullable(),
});

export const threadSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  userId: uuidSchema,
  partnerName: z.string(),
  subject: z.string().nullable(),
  status: threadStatusSchema,
  lastMessageAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  /** Oldest first, so the client renders the transcript bottom-up. */
  messages: z.array(messageSchema),
  /** Position of the oldest message returned; null at the start of the thread. */
  olderCursor: z.string().nullable(),
});

export const threadSummarySchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  subject: z.string().nullable(),
  status: threadStatusSchema,
  lastMessageAt: timestampSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
});

export const adminThreadSummarySchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  userId: uuidSchema,
  partnerName: z.string(),
  subject: z.string().nullable(),
  status: threadStatusSchema,
  lastMessageAt: timestampSchema.nullable(),
  lastMessagePreview: z.string().nullable(),
  unreadFromPartnerCount: z.number().int().nonnegative(),
});

export const sendMessageBodySchema = z.object({
  body: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  documentId: uuidSchema.optional(),
});

export const listThreadsQuerySchema = paginationQuerySchema.extend({
  status: threadStatusSchema.optional(),
  projectId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
});

export const threadMessagesQuerySchema = paginationQuerySchema;

export const threadIdParamsSchema = z.object({ threadId: uuidSchema });

export const threadReadResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export const adminThreadPageSchema = pageOf(adminThreadSummarySchema);

export type ThreadStatus = z.infer<typeof threadStatusSchema>;
export type MessageSenderKind = z.infer<typeof messageSenderKindSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type ThreadSummary = z.infer<typeof threadSummarySchema>;
export type AdminThreadSummary = z.infer<typeof adminThreadSummarySchema>;
export type AdminThreadPage = z.infer<typeof adminThreadPageSchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
export type ThreadMessagesQuery = z.infer<typeof threadMessagesQuerySchema>;
export type ThreadIdParams = z.infer<typeof threadIdParamsSchema>;
export type ThreadReadResult = z.infer<typeof threadReadResultSchema>;
