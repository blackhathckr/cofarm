import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { requireIdempotencyKey } from '../../middleware/idempotency.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';

import * as controller from './mis.controller.ts';
import { misSchemas } from './mis.validation.ts';

/** Registered under the projects prefix. */
export const misRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/:projectId/mis', {
    schema: misSchemas.list,
    preValidation: requireProjectInScope,
    handler: controller.list,
  });

  app.get('/:projectId/mis/:reportId', {
    schema: misSchemas.get,
    preValidation: requireProjectInScope,
    handler: controller.get,
  });

  app.post('/:projectId/mis', {
    schema: misSchemas.create,
    preValidation: [requirePermission(PERMISSIONS.misWrite), requireIdempotencyKey],
    handler: controller.create,
  });

  app.patch('/:projectId/mis/:reportId', {
    schema: misSchemas.update,
    preValidation: requirePermission(PERMISSIONS.misWrite),
    handler: controller.update,
  });

  app.post('/:projectId/mis/:reportId/unpublish', {
    schema: misSchemas.unpublish,
    preValidation: [requirePermission(PERMISSIONS.misPublish), requireIdempotencyKey],
    handler: controller.unpublish,
  });

  app.post('/:projectId/mis/:reportId/publish', {
    schema: misSchemas.publish,
    preValidation: [requirePermission(PERMISSIONS.misPublish), requireIdempotencyKey],
    handler: controller.publish,
  });

  app.post('/:projectId/mis/:reportId/compose', {
    schema: misSchemas.compose,
    preValidation: requirePermission(PERMISSIONS.misWrite),
    handler: controller.compose,
  });

  app.delete('/:projectId/mis/:reportId', {
    schema: misSchemas.remove,
    preValidation: requirePermission(PERMISSIONS.misWrite),
    handler: controller.remove,
  });

  app.get('/:projectId/mis/:reportId/receipts', {
    schema: misSchemas.receipts,
    preValidation: [
      requirePermission(PERMISSIONS.misRead, PERMISSIONS.trackingRead),
      attachProjectScope,
    ],
    handler: controller.receipts,
  });

  return Promise.resolve();
};

export const myMisRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/latest', {
    schema: misSchemas.latest,
    preValidation: attachProjectScope,
    handler: controller.latest,
  });

  return Promise.resolve();
};
