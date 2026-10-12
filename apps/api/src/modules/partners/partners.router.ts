import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';
import * as controller from './partners.controller.ts';
import { partnerSchemas } from './partners.validation.ts';

export const partnersRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: partnerSchemas.list,
    preValidation: [requirePermission(PERMISSIONS.partnerRead), attachProjectScope],
    handler: controller.list,
  });

  app.get('/:partnerId', {
    schema: partnerSchemas.get,
    preValidation: [requirePermission(PERMISSIONS.partnerRead), attachProjectScope],
    handler: controller.get,
  });

  app.post('/', {
    schema: partnerSchemas.create,
    preValidation: requirePermission(PERMISSIONS.partnerWrite),
    handler: controller.create,
  });

  app.patch('/:partnerId', {
    schema: partnerSchemas.update,
    preValidation: requirePermission(PERMISSIONS.partnerWrite),
    handler: controller.update,
  });

  app.post('/:partnerId/memberships', {
    schema: partnerSchemas.createMembership,
    preValidation: requirePermission(PERMISSIONS.membershipWrite),
    handler: controller.createMembership,
  });

  app.patch('/:partnerId/memberships/:membershipId', {
    schema: partnerSchemas.updateMembership,
    preValidation: requirePermission(PERMISSIONS.membershipWrite),
    handler: controller.updateMembership,
  });

  return Promise.resolve();
};

/** Registered under the projects prefix: a partner reads their own project's
 * co-partners, so the guard is the project scope rather than a permission. */
export const projectPartnersRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/:projectId/partners', {
    schema: partnerSchemas.listProjectPartners,
    preValidation: requireProjectInScope,
    handler: controller.listProjectPartners,
  });

  return Promise.resolve();
};
