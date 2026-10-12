import {
  adminLoginBodySchema,
  authUserSchema,
  refreshBodySchema,
  requestOtpBodySchema,
  requestOtpResponseSchema,
  sessionSchema,
  verifyOtpBodySchema,
} from '@cofarm/contracts/auth';
import { okSchema } from '@cofarm/contracts/primitives';

export const authSchemas = {
  requestOtp: {
    body: requestOtpBodySchema,
    response: { 200: requestOtpResponseSchema },
  },
  verifyOtp: {
    body: verifyOtpBodySchema,
    response: { 200: sessionSchema },
  },
  adminLogin: {
    body: adminLoginBodySchema,
    response: { 200: sessionSchema },
  },
  refresh: {
    body: refreshBodySchema,
    response: { 200: sessionSchema },
  },
  logout: {
    body: refreshBodySchema,
    response: { 200: okSchema },
  },
  me: {
    response: { 200: authUserSchema },
  },
} as const;
