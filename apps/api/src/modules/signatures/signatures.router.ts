import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireKind, requirePermission } from '../../middleware/authorize.ts';
import { requireIdempotencyKey } from '../../middleware/idempotency.ts';
import { attachProjectScope } from '../../middleware/project-scope.ts';

import * as controller from './signatures.controller.ts';
import { signatureSchemas } from './signatures.validation.ts';

/** Registered under the projects prefix: a request is issued against the
 * project whose agreement or addendum it carries. */
export const projectSignaturesRouter: FastifyPluginAsyncZod = (app) => {
  app.post('/:projectId/signatures', {
    schema: signatureSchemas.issue,
    preValidation: [
      requirePermission(PERMISSIONS.signatureWrite),
      attachProjectScope,
      requireIdempotencyKey,
    ],
    handler: controller.issue,
  });

  return Promise.resolve();
};

export const signaturesRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: signatureSchemas.list,
    preValidation: [requirePermission(PERMISSIONS.signatureRead), attachProjectScope],
    handler: controller.list,
  });

  app.post('/remind-all', {
    schema: signatureSchemas.remindAll,
    preValidation: [
      requirePermission(PERMISSIONS.reminderSend),
      attachProjectScope,
      requireIdempotencyKey,
    ],
    handler: controller.remindAll,
  });

  app.post('/:requestId/remind', {
    schema: signatureSchemas.remind,
    preValidation: [requirePermission(PERMISSIONS.signatureWrite), attachProjectScope],
    handler: controller.remind,
  });

  app.post('/:requestId/cancel', {
    schema: signatureSchemas.cancel,
    preValidation: [requirePermission(PERMISSIONS.signatureWrite), attachProjectScope],
    handler: controller.cancel,
  });

  app.post('/:requestId/sign', {
    schema: signatureSchemas.sign,
    preValidation: [requireKind('partner'), attachProjectScope, requireIdempotencyKey],
    handler: controller.sign,
  });

  return Promise.resolve();
};

export const mySignaturesRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: signatureSchemas.mine,
    preValidation: [requireKind('partner'), attachProjectScope],
    handler: controller.mine,
  });

  return Promise.resolve();
};
