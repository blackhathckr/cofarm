import { z } from 'zod';

import { pageOf, paginationQuerySchema, timestampSchema, uuidSchema } from './primitives.ts';

export const documentTypeSchema = z.enum([
  'mis_report',
  'agreement',
  'statement',
  'weighment_slip',
  'harvest_photo',
  'update_photo',
  'partner_document',
  'other',
]);

export const documentMimeSchema = z.enum([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentMime = z.infer<typeof documentMimeSchema>;

export const MAX_DOCUMENT_BYTES = 26_214_400;
export const MAX_VIDEO_BYTES = 209_715_200;

export function maxUploadBytes(mime: string): number {
  return mime.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_DOCUMENT_BYTES;
}

const ALLOWED_MIMES: readonly string[] = [...documentMimeSchema.options];

export function isDocumentMime(mime: string): boolean {
  return ALLOWED_MIMES.includes(mime);
}

export const documentSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema.nullable(),
  ownerUserId: uuidSchema.nullable(),
  type: documentTypeSchema,
  originalName: z.string(),
  mime: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  uploadedBy: uuidSchema.nullable(),
  createdAt: timestampSchema,
});

export const uploadUrlBodySchema = z.object({
  projectId: uuidSchema.nullable(),
  type: documentTypeSchema,
  originalName: z.string().min(1).max(255),
  mime: documentMimeSchema,
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
  /**
   * Whose document this is. Omitted for project-wide content every member of
   * the project may read — an MIS report, an update photo. Named for a file
   * that belongs to one partner: their agreement, their statement.
   */
  ownerUserId: uuidSchema.optional(),
});

export const uploadTicketSchema = z.object({
  documentId: uuidSchema,
  uploadUrl: z.string(),
  storageKey: z.string(),
  expiresInSeconds: z.number().int().positive(),
});

export const downloadTicketSchema = z.object({
  documentId: uuidSchema,
  downloadUrl: z.string(),
  originalName: z.string(),
  expiresInSeconds: z.number().int().positive(),
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  includePending: z.coerce.boolean().default(false),
  projectId: uuidSchema.optional(),
  ownerUserId: uuidSchema.optional(),
  type: documentTypeSchema.optional(),
});

export const documentIdParamsSchema = z.object({ documentId: uuidSchema });

export const documentPageSchema = pageOf(documentSchema);

export type Document = z.infer<typeof documentSchema>;
export type UploadUrlBody = z.infer<typeof uploadUrlBodySchema>;
export type UploadTicket = z.infer<typeof uploadTicketSchema>;
export type DownloadTicket = z.infer<typeof downloadTicketSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
