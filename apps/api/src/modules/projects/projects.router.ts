import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { attachProjectScope, requireProjectInScope } from '../../middleware/project-scope.ts';
import * as controller from './projects.controller.ts';
import { projectSchemas } from './projects.validation.ts';

export const projectsRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/', {
    schema: projectSchemas.list,
    preValidation: attachProjectScope,
    handler: controller.list,
  });

  app.get('/:projectId', {
    schema: projectSchemas.get,
    preValidation: requireProjectInScope,
    handler: controller.get,
  });

  app.post('/', {
    schema: projectSchemas.create,
    preValidation: requirePermission(PERMISSIONS.projectWrite),
    handler: controller.create,
  });

  app.patch('/:projectId', {
    schema: projectSchemas.update,
    preValidation: requirePermission(PERMISSIONS.projectWrite),
    handler: controller.update,
  });

  app.get('/:projectId/cycles', {
    schema: projectSchemas.listCycles,
    preValidation: requireProjectInScope,
    handler: controller.listCycles,
  });

  app.post('/:projectId/cycles', {
    schema: projectSchemas.createCycle,
    preValidation: requirePermission(PERMISSIONS.cycleWrite),
    handler: controller.createCycle,
  });

  app.patch('/:projectId/cycles/:cycleId/milestone', {
    schema: projectSchemas.setMilestone,
    preValidation: requirePermission(PERMISSIONS.cycleWrite),
    handler: controller.setMilestone,
  });

  app.post('/:projectId/cycles/:cycleId/status', {
    schema: projectSchemas.setCycleStatus,
    preValidation: requirePermission(PERMISSIONS.cycleWrite),
    handler: controller.setCycleStatus,
  });

  app.delete('/:projectId/cycles/:cycleId', {
    schema: projectSchemas.deleteCycle,
    preValidation: requirePermission(PERMISSIONS.cycleWrite),
    handler: controller.deleteCycle,
  });

  return Promise.resolve();
};
