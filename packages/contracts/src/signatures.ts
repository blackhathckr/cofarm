import { z } from 'zod';

import { documentTypeSchema } from './documents.ts';
import {
  pageOf,
  paginationQuerySchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const signatureStatusSchema = z.enum(['pending', 'signed', 'declined', 'cancelled']);

/**
 * There is no e-sign provider: a signature is an in-app acknowledgement, so the
 * record of who signed, when and from where is the whole artefact.
 */
export const mySignatureRequestSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  documentId: uuidSchema,
  documentName: z.string(),
  documentType: documentTypeSchema,
  status: signatureStatusSchema,
  signedName: z.string().nullable(),
  sentAt: timestampSchema,
  signedAt: timestampSchema.nullable(),
  remindedAt: timestampSchema.nullable(),
});

export const signatureRequestSchema = mySignatureRequestSchema.extend({
  userId: uuidSchema,
  partnerName: z.string(),
});

export const issueSignatureBodySchema = z.object({
  documentId: uuidSchema,
  userId: uuidSchema,
  note: z.string().min(1).max(500).optional(),
});

export const signSignatureBodySchema = z.object({
  signedName: z.string().trim().min(1).max(120),
  /** Only `true` is accepted: a signature is an affirmative act, not a default. */
  agreed: z.literal(true),
});

export const listSignaturesQuerySchema = paginationQuerySchema.extend({
  status: signatureStatusSchema.optional(),
  projectId: uuidSchema.optional(),
});

export const remindAllBodySchema = z.object({ projectId: uuidSchema });

export const remindAllResultSchema = z.object({
  reminded: z.number().int().nonnegative(),
});

export const signatureRequestParamsSchema = z.object({ requestId: uuidSchema });

export const signaturePageSchema = pageOf(signatureRequestSchema);

export type SignatureStatus = z.infer<typeof signatureStatusSchema>;
export type MySignatureRequest = z.infer<typeof mySignatureRequestSchema>;
export type SignatureRequest = z.infer<typeof signatureRequestSchema>;
export type SignaturePage = z.infer<typeof signaturePageSchema>;
export type IssueSignatureBody = z.infer<typeof issueSignatureBodySchema>;
export type SignSignatureBody = z.infer<typeof signSignatureBodySchema>;
export type ListSignaturesQuery = z.infer<typeof listSignaturesQuerySchema>;
export type RemindAllBody = z.infer<typeof remindAllBodySchema>;
export type RemindAllResult = z.infer<typeof remindAllResultSchema>;
export type SignatureRequestParams = z.infer<typeof signatureRequestParamsSchema>;
