import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireKind, requirePermission } from '../../middleware/authorize.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';

import * as controller from './messaging.controller.ts';
import { messagingSchemas } from './messaging.validation.ts';

/** Registered under the projects prefix: a partner's thread is reached through
 * the project it belongs to. */
export const projectThreadRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/:projectId/thread', {
    schema: messagingSchemas.myThread,
    preValidation: [requireKind('partner'), requireProjectInScope],
    handler: controller.myThread,
  });

  app.post('/:projectId/thread/messages', {
    schema: messagingSchemas.sendMyMessage,
    preValidation: [requireKind('partner'), requireProjectInScope],
    handler: controller.sendMyMessage,
  });

  app.post('/:projectId/thread/read', {
    schema: messagingSchemas.readMyThread,
    preValidation: [requireKind('partner'), requireProjectInScope],
    handler: controller.readMyThread,
  });

  return Promise.resolve();
};

export const myThreadsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: messagingSchemas.myThreads,
    preValidation: [requireKind('partner'), attachProjectScope],
    handler: controller.myThreads,
  });

  return Promise.resolve();
};

export const threadsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: messagingSchemas.list,
    preValidation: [requirePermission(PERMISSIONS.messageRead), attachProjectScope],
    handler: controller.list,
  });

  app.get('/:threadId', {
    schema: messagingSchemas.get,
    preValidation: [requirePermission(PERMISSIONS.messageRead), attachProjectScope],
    handler: controller.get,
  });

  app.post('/:threadId/messages', {
    schema: messagingSchemas.reply,
    preValidation: [requirePermission(PERMISSIONS.messageWrite), attachProjectScope],
    handler: controller.reply,
  });

  app.post('/:threadId/resolve', {
    schema: messagingSchemas.resolve,
    preValidation: [requirePermission(PERMISSIONS.messageWrite), attachProjectScope],
    handler: controller.resolve,
  });

  app.post('/:threadId/reopen', {
    schema: messagingSchemas.reopen,
    preValidation: [requirePermission(PERMISSIONS.messageWrite), attachProjectScope],
    handler: controller.reopen,
  });

  return Promise.resolve();
};
