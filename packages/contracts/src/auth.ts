import { z } from 'zod';

import { mobileSchema, timestampSchema, uuidSchema } from './primitives.ts';

export const requestOtpBodySchema = z.object({
  mobile: mobileSchema,
});

export const requestOtpResponseSchema = z.object({
  challengeId: uuidSchema,
  expiresAt: timestampSchema,
  /** Present only while AUTH_PROVIDER=dev, so local work needs no SMS. */
  devCode: z.string().optional(),
});

export const verifyOtpBodySchema = z.object({
  challengeId: uuidSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const adminLoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  totp: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(16),
});

export const sessionProjectSchema = z.object({
  projectId: uuidSchema,
  code: z.string(),
  name: z.string(),
});

export const authUserSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  kind: z.enum(['partner', 'admin']),
  mobile: z.string().nullable(),
  email: z.string().nullable(),
  permissions: z.array(z.string()),
  /** Always false for a partner: an OTP login has no second factor to enrol. */
  twoFactorEnabled: z.boolean(),
  /** Projects the caller currently has an active membership in. */
  projects: z.array(sessionProjectSchema),
});

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: authUserSchema,
});

export type RequestOtpBody = z.infer<typeof requestOtpBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
