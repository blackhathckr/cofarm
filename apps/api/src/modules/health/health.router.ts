import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import * as controller from './health.controller.ts';
import { healthSchemas } from './health.validation.ts';

export const healthRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/live', {
    schema: healthSchemas.live,
    config: { rateLimit: false },
    handler: controller.live,
  });
  app.get('/ready', {
    schema: healthSchemas.ready,
    config: { rateLimit: false },
    handler: controller.ready,
  });
  return Promise.resolve();
};
