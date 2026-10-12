import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { attachProjectScope } from '../../middleware/project-scope.ts';
import * as controller from './documents.controller.ts';
import { documentSchemas } from './documents.validation.ts';

export const documentsRouter: FastifyPluginAsyncZod = (app) => {
  app.post('/upload-url', {
    schema: documentSchemas.uploadUrl,
    preValidation: [attachProjectScope, requirePermission(PERMISSIONS.documentWrite)],
    handler: controller.uploadUrl,
  });

  app.post('/:documentId/confirm', {
    schema: documentSchemas.confirm,
    preValidation: [attachProjectScope, requirePermission(PERMISSIONS.documentWrite)],
    handler: controller.confirm,
  });

  app.get('/:documentId/download-url', {
    schema: documentSchemas.downloadUrl,
    preValidation: attachProjectScope,
    handler: controller.downloadUrl,
  });

  app.get('/', {
    schema: documentSchemas.list,
    preValidation: attachProjectScope,
    handler: controller.list,
  });

  app.delete('/:documentId', {
    schema: documentSchemas.remove,
    preValidation: [attachProjectScope, requirePermission(PERMISSIONS.documentWrite)],
    handler: controller.remove,
  });

  return Promise.resolve();
};
