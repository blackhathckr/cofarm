import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { requireIdempotencyKey } from '../../middleware/idempotency.ts';
import { attachProjectScope } from '../../middleware/project-scope.ts';

import * as controller from './tracking.controller.ts';
import { trackingSchemas } from './tracking.validation.ts';

export const trackingRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/receipts', {
    schema: trackingSchemas.receipts,
    preValidation: [requirePermission(PERMISSIONS.trackingRead), attachProjectScope],
    handler: controller.receipts,
  });

  app.post('/remind-all', {
    schema: trackingSchemas.remindAll,
    preValidation: [
      requirePermission(PERMISSIONS.reminderSend),
      attachProjectScope,
      requireIdempotencyKey,
    ],
    handler: controller.remindAll,
  });

  return Promise.resolve();
};
