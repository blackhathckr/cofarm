import {
  requestOtpResponseSchema,
  sessionSchema,
  type RequestOtpBody,
  type VerifyOtpBody,
} from '@cofarm/contracts/auth';

import { request } from '@/lib/api-client.ts';

export function requestOtp(body: RequestOtpBody) {
  return request('/v1/auth/partner/otp', requestOtpResponseSchema, {
    method: 'POST',
    body,
  });
}

export function verifyOtp(body: VerifyOtpBody) {
  return request('/v1/auth/partner/otp/verify', sessionSchema, { method: 'POST', body });
}
