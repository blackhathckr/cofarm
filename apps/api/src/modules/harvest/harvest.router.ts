import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { requireIdempotencyKey } from '../../middleware/idempotency.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';

import * as controller from './harvest.controller.ts';
import { requireHarvestRead, requireStatementRead } from './harvest.guard.ts';
import { harvestSchemas } from './harvest.validation.ts';

/** Registered under the projects prefix: a harvest belongs to one cycle of one project. */
export const harvestRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/:projectId/harvest', {
    schema: harvestSchemas.list,
    preValidation: [requireProjectInScope, requireHarvestRead],
    handler: controller.list,
  });

  app.get('/:projectId/harvest/:harvestId', {
    schema: harvestSchemas.get,
    preValidation: [requireProjectInScope, requireHarvestRead],
    handler: controller.get,
  });

  app.post('/:projectId/harvest', {
    schema: harvestSchemas.create,
    preValidation: requirePermission(PERMISSIONS.harvestWrite),
    handler: controller.create,
  });

  app.patch('/:projectId/harvest/:harvestId', {
    schema: harvestSchemas.update,
    preValidation: requirePermission(PERMISSIONS.harvestWrite),
    handler: controller.update,
  });

  app.get('/:projectId/harvest/:harvestId/preview', {
    schema: harvestSchemas.preview,
    preValidation: [requirePermission(PERMISSIONS.harvestRead), attachProjectScope],
    handler: controller.preview,
  });

  app.post('/:projectId/harvest/:harvestId/publish', {
    schema: harvestSchemas.publish,
    preValidation: [requirePermission(PERMISSIONS.harvestPublish), requireIdempotencyKey],
    handler: controller.publish,
  });

  app.post('/:projectId/harvest/:harvestId/payouts', {
    schema: harvestSchemas.payouts,
    preValidation: [requirePermission(PERMISSIONS.harvestWrite), requireIdempotencyKey],
    handler: controller.payouts,
  });

  app.get('/:projectId/cycles/:cycleId/statement', {
    schema: harvestSchemas.statement,
    preValidation: [requireProjectInScope, requireStatementRead],
    handler: controller.statement,
  });

  app.get('/:projectId/cycles/:cycleId/statement.pdf', {
    schema: harvestSchemas.statementPdf,
    preValidation: [requireProjectInScope, requireStatementRead],
    handler: controller.statementPdf,
  });

  return Promise.resolve();
};

export const myStatementsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: harvestSchemas.myStatements,
    preValidation: attachProjectScope,
    handler: controller.myStatements,
  });

  return Promise.resolve();
};
