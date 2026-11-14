import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';

import * as controller from './expense-heads.controller.ts';
import { expenseHeadSchemas } from './expense-heads.validation.ts';

export const expenseHeadsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: expenseHeadSchemas.list,
    preValidation: requirePermission(PERMISSIONS.expenseRead),
    handler: controller.list,
  });

  app.post('/', {
    schema: expenseHeadSchemas.create,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.create,
  });

  app.patch('/:headId', {
    schema: expenseHeadSchemas.update,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.update,
  });

  return Promise.resolve();
};
