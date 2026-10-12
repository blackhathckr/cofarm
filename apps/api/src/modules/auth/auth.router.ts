import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth } from '../../middleware/authorize.ts';
import * as controller from './auth.controller.ts';
import { authSchemas } from './auth.validation.ts';

/**
 * Keyed by IP, and Indian carriers NAT heavily, so a tight budget here would
 * lock out every partner behind one address. The per-mobile challenge counter
 * in the auth service is the real control; these only blunt bulk enumeration.
 */
const otpRateLimit = { max: 60, timeWindow: '15 minutes' } as const;
const loginRateLimit = { max: 60, timeWindow: '15 minutes' } as const;

export const authRouter: FastifyPluginAsyncZod = (app) => {
  app.post('/partner/otp', {
    schema: authSchemas.requestOtp,
    config: { rateLimit: otpRateLimit },
    handler: controller.requestOtp,
  });

  app.post('/partner/otp/verify', {
    schema: authSchemas.verifyOtp,
    config: { rateLimit: loginRateLimit },
    handler: controller.verifyOtp,
  });

  app.post('/admin/login', {
    schema: authSchemas.adminLogin,
    config: { rateLimit: loginRateLimit },
    handler: controller.adminLogin,
  });

  app.post('/refresh', {
    schema: authSchemas.refresh,
    handler: controller.refresh,
  });

  app.post('/logout', {
    schema: authSchemas.logout,
    handler: controller.logout,
  });

  app.get('/me', {
    schema: authSchemas.me,
    preValidation: requireAuth,
    handler: controller.me,
  });

  return Promise.resolve();
};
