import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requireKind, requirePermission } from '../../middleware/authorize.ts';
import * as controller from './admin-users.controller.ts';
import { adminUserSchemas } from './admin-users.validation.ts';

/** Registered under `/v1`: the catalogue spans `/admin/*` and `/me/*`. */
export const adminUsersRouter: FastifyPluginAsyncZod = (app) => {
  app.get('/admin/users', {
    schema: adminUserSchemas.listUsers,
    preValidation: requirePermission(PERMISSIONS.userAdmin),
    handler: controller.listUsers,
  });

  app.post('/admin/users', {
    schema: adminUserSchemas.createUser,
    preValidation: requirePermission(PERMISSIONS.userAdmin),
    handler: controller.createUser,
  });

  app.patch('/admin/users/:userId', {
    schema: adminUserSchemas.updateUser,
    preValidation: requirePermission(PERMISSIONS.userAdmin),
    handler: controller.updateUser,
  });

  app.post('/admin/users/:userId/roles', {
    schema: adminUserSchemas.setUserRoles,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.setUserRoles,
  });

  app.post('/admin/users/:userId/password', {
    schema: adminUserSchemas.setUserPassword,
    preValidation: requirePermission(PERMISSIONS.userAdmin),
    handler: controller.setUserPassword,
  });

  app.delete('/admin/users/:userId', {
    schema: adminUserSchemas.deleteUser,
    preValidation: requirePermission(PERMISSIONS.userAdmin),
    handler: controller.deleteUser,
  });

  app.post('/me/2fa/enrol', {
    schema: adminUserSchemas.enrolTwoFactor,
    preValidation: requireKind('admin'),
    handler: controller.enrolTwoFactor,
  });

  app.post('/me/2fa/confirm', {
    schema: adminUserSchemas.confirmTwoFactor,
    preValidation: requireKind('admin'),
    handler: controller.confirmTwoFactor,
  });

  app.post('/me/2fa/disable', {
    schema: adminUserSchemas.disableTwoFactor,
    preValidation: requireKind('admin'),
    handler: controller.disableTwoFactor,
  });

  app.post('/me/password', {
    schema: adminUserSchemas.changeOwnPassword,
    preValidation: requireKind('admin'),
    handler: controller.changeOwnPassword,
  });

  app.get('/admin/roles', {
    schema: adminUserSchemas.listRoles,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.listRoles,
  });

  app.post('/admin/roles', {
    schema: adminUserSchemas.createRole,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.createRole,
  });

  app.patch('/admin/roles/:roleId', {
    schema: adminUserSchemas.updateRole,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.updateRole,
  });

  app.delete('/admin/roles/:roleId', {
    schema: adminUserSchemas.deleteRole,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.deleteRole,
  });

  app.get('/admin/permissions', {
    schema: adminUserSchemas.listPermissions,
    preValidation: requirePermission(PERMISSIONS.roleAdmin),
    handler: controller.listPermissions,
  });

  return Promise.resolve();
};
