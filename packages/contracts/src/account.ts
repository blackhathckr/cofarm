import { z } from 'zod';

import {
  dateSchema,
  paiseSchema,
  projectCodeSchema,
  timestampSchema,
  uuidSchema,
} from './primitives.ts';

export const accountKindSchema = z.enum(['partner', 'admin']);

export const accountMembershipSchema = z.object({
  projectId: uuidSchema,
  projectCode: projectCodeSchema,
  projectName: z.string(),
  contributionPaise: paiseSchema,
  joinedAt: dateSchema,
});

export const accountProfileSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  mobile: z.string().nullable(),
  email: z.string().nullable(),
  kind: accountKindSchema,
  /** Always false for a partner: an OTP login has no second factor to enrol. */
  twoFactorEnabled: z.boolean(),
  memberships: z.array(accountMembershipSchema),
});

/**
 * Mobile is the login identity and is admin-managed, so it is not in this body.
 * Neither are status and roles.
 */
export const updateProfileBodySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.email().max(160).optional(),
});

export const deleteAccountBodySchema = z.object({
  confirm: z.literal(true),
  /** Required for an admin, who signs in with a password rather than an OTP. */
  password: z.string().min(1).max(200).optional(),
});

export const retainedRecordSchema = z.object({
  record: z.string(),
  reason: z.string(),
});

export const accountDeletionResultSchema = z.object({
  userId: uuidSchema,
  deletedAt: timestampSchema,
  cleared: z.array(z.string()),
  retained: z.array(retainedRecordSchema),
  membershipsExited: z.number().int().nonnegative(),
  sessionsRevoked: z.number().int().nonnegative(),
  devicesRemoved: z.number().int().nonnegative(),
  note: z.string(),
});

export const deletionPolicySchema = z.object({
  summary: z.string(),
  cleared: z.array(z.string()),
  retained: z.array(retainedRecordSchema),
  isReversible: z.literal(false),
  reRegistration: z.string(),
  note: z.string(),
});

export type AccountKind = z.infer<typeof accountKindSchema>;
export type AccountMembership = z.infer<typeof accountMembershipSchema>;
export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;
export type RetainedRecord = z.infer<typeof retainedRecordSchema>;
export type AccountDeletionResult = z.infer<typeof accountDeletionResultSchema>;
export type DeletionPolicy = z.infer<typeof deletionPolicySchema>;
