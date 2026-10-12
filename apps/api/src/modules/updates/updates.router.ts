import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { requireIdempotencyKey } from '../../middleware/idempotency.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';

import * as controller from './updates.controller.ts';
import { updateSchemas } from './updates.validation.ts';

/** Registered under the projects prefix: every update and activity entry
 * belongs to one project, and the feed is what a partner opens. */
export const projectUpdatesRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/:projectId/updates', {
    schema: updateSchemas.list,
    preValidation: [requirePermission(PERMISSIONS.updateRead), attachProjectScope],
    handler: controller.list,
  });

  app.post('/:projectId/updates', {
    schema: updateSchemas.create,
    preValidation: [
      requirePermission(PERMISSIONS.updateWrite),
      attachProjectScope,
      requireIdempotencyKey,
    ],
    handler: controller.create,
  });

  app.get('/:projectId/updates/feed', {
    schema: updateSchemas.feed,
    preValidation: requireProjectInScope,
    handler: controller.feed,
  });

  app.get('/:projectId/updates/:updateId', {
    schema: updateSchemas.get,
    preValidation: requireProjectInScope,
    handler: controller.get,
  });

  app.patch('/:projectId/updates/:updateId', {
    schema: updateSchemas.edit,
    preValidation: [requirePermission(PERMISSIONS.updateWrite), attachProjectScope],
    handler: controller.edit,
  });

  app.post('/:projectId/updates/:updateId/unpublish', {
    schema: updateSchemas.unpublish,
    preValidation: [requirePermission(PERMISSIONS.updatePublish), requireIdempotencyKey],
    handler: controller.unpublish,
  });

  app.post('/:projectId/updates/:updateId/publish', {
    schema: updateSchemas.publish,
    preValidation: [
      requirePermission(PERMISSIONS.updatePublish),
      attachProjectScope,
      requireIdempotencyKey,
    ],
    handler: controller.publish,
  });

  app.delete('/:projectId/updates/:updateId', {
    schema: updateSchemas.remove,
    preValidation: [requirePermission(PERMISSIONS.updateWrite), attachProjectScope],
    handler: controller.remove,
  });

  app.post('/:projectId/activity', {
    schema: updateSchemas.createActivity,
    preValidation: [requirePermission(PERMISSIONS.updateWrite), attachProjectScope],
    handler: controller.createActivity,
  });

  app.get('/:projectId/activity', {
    schema: updateSchemas.listActivity,
    preValidation: requireProjectInScope,
    handler: controller.listActivity,
  });

  return Promise.resolve();
};
