import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';

import * as controller from './jobs.controller.ts';
import { jobSchemas } from './jobs.validation.ts';

export const jobsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: jobSchemas.list,
    preValidation: requirePermission(PERMISSIONS.jobsRead),
    handler: controller.list,
  });

  return Promise.resolve();
};
