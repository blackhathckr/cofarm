import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireKind, requirePermission } from '../../middleware/authorize.ts';
import { attachProjectScope } from '../../middleware/project-scope.ts';

import * as controller from './dashboard.controller.ts';
import { dashboardSchemas } from './dashboard.validation.ts';

/** Registered under `/v1/dashboard`. Read-only: the module has no mutations. */
export const dashboardRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/admin', {
    schema: dashboardSchemas.admin,
    preValidation: [requirePermission(PERMISSIONS.projectRead), attachProjectScope],
    handler: controller.admin,
  });

  app.get('/partner', {
    schema: dashboardSchemas.partner,
    preValidation: [requireKind('partner'), attachProjectScope],
    handler: controller.partner,
  });

  return Promise.resolve();
};
