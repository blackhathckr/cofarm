import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireAuth } from '../../middleware/authorize.ts';

import * as controller from './notifications.controller.ts';
import { notificationSchemas } from './notifications.validation.ts';

export const notificationsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: notificationSchemas.list,
    preValidation: requireAuth,
    handler: controller.list,
  });

  app.post('/read-all', {
    schema: notificationSchemas.markAllRead,
    preValidation: requireAuth,
    handler: controller.markAllRead,
  });

  app.post('/:notificationId/read', {
    schema: notificationSchemas.markRead,
    preValidation: requireAuth,
    handler: controller.markRead,
  });

  return Promise.resolve();
};

export const devicesRouter: FastifyPluginAsyncZod = (app) => {
  app.post('/', {
    schema: notificationSchemas.registerDevice,
    preValidation: requireAuth,
    handler: controller.registerDevice,
  });

  app.delete('/:token', {
    schema: notificationSchemas.unregisterDevice,
    preValidation: requireAuth,
    handler: controller.unregisterDevice,
  });

  return Promise.resolve();
};
