import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth } from '../../middleware/authorize.ts';
import { attachProjectScope } from '../../middleware/project-scope.ts';

import * as controller from './account.controller.ts';
import { accountSchemas } from './account.validation.ts';

/** Registered under `/v1/me`. */
export const accountRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: accountSchemas.getProfile,
    preValidation: attachProjectScope,
    handler: controller.getProfile,
  });

  app.patch('/', {
    schema: accountSchemas.updateProfile,
    preValidation: attachProjectScope,
    handler: controller.updateProfile,
  });

  app.post('/account/delete', {
    schema: accountSchemas.deleteAccount,
    preValidation: attachProjectScope,
    handler: controller.deleteAccount,
  });

  app.get('/account/deletion-policy', {
    schema: accountSchemas.deletionPolicy,
    preValidation: requireAuth,
    handler: controller.deletionPolicy,
  });

  return Promise.resolve();
};
