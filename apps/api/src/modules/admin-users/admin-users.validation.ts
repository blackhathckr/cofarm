import {
  adminUserIdParamsSchema,
  adminUserPageSchema,
  adminUserSchema,
  changeOwnPasswordBodySchema,
  confirmTwoFactorBodySchema,
  createAdminUserBodySchema,
  createRoleBodySchema,
  disableTwoFactorBodySchema,
  listAdminUsersQuerySchema,
  permissionCatalogueSchema,
  roleIdParamsSchema,
  roleSchema,
  setAdminUserPasswordBodySchema,
  setAdminUserRolesBodySchema,
  twoFactorEnrolmentSchema,
  updateAdminUserBodySchema,
  updateRoleBodySchema,
} from '@cofarm/contracts/admin-users';
import { okSchema } from '@cofarm/contracts/primitives';
import { z } from 'zod';

export const adminUserSchemas = {
  listUsers: {
    querystring: listAdminUsersQuerySchema,
    response: { 200: adminUserPageSchema },
  },
  createUser: {
    body: createAdminUserBodySchema,
    response: { 201: adminUserSchema },
  },
  updateUser: {
    params: adminUserIdParamsSchema,
    body: updateAdminUserBodySchema,
    response: { 200: adminUserSchema },
  },
  setUserRoles: {
    params: adminUserIdParamsSchema,
    body: setAdminUserRolesBodySchema,
    response: { 200: adminUserSchema },
  },
  setUserPassword: {
    params: adminUserIdParamsSchema,
    body: setAdminUserPasswordBodySchema,
    response: { 200: okSchema },
  },
  deleteUser: {
    params: adminUserIdParamsSchema,
    response: { 200: adminUserSchema },
  },
  enrolTwoFactor: {
    response: { 200: twoFactorEnrolmentSchema },
  },
  confirmTwoFactor: {
    body: confirmTwoFactorBodySchema,
    response: { 200: okSchema },
  },
  disableTwoFactor: {
    body: disableTwoFactorBodySchema,
    response: { 200: okSchema },
  },
  changeOwnPassword: {
    body: changeOwnPasswordBodySchema,
    response: { 200: okSchema },
  },
  listRoles: {
    response: { 200: z.array(roleSchema) },
  },
  createRole: {
    body: createRoleBodySchema,
    response: { 201: roleSchema },
  },
  updateRole: {
    params: roleIdParamsSchema,
    body: updateRoleBodySchema,
    response: { 200: roleSchema },
  },
  deleteRole: {
    params: roleIdParamsSchema,
    response: { 200: okSchema },
  },
  listPermissions: {
    response: { 200: permissionCatalogueSchema },
  },
} as const;
