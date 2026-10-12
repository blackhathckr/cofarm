import { z } from 'zod';

import { PERMISSIONS } from './permissions.ts';
import { pageOf, paginationQuerySchema, timestampSchema, uuidSchema } from './primitives.ts';

export const permissionKeySchema = z.enum(PERMISSIONS);

export const roleKeySchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Expected a kebab-case key like finance-viewer');

export const adminUserStatusSchema = z.enum(['active', 'suspended', 'deleted']);

/** A console caller may activate or suspend. Deletion has its own endpoint. */
export const adminUserStatusPatchSchema = z.enum(['active', 'suspended']);

export const adminUserSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string().nullable(),
  status: adminUserStatusSchema,
  roleKeys: z.array(z.string()),
  lastLoginAt: timestampSchema.nullable(),
  twoFactorEnabled: z.boolean(),
  createdAt: timestampSchema,
});

export const adminUserPageSchema = pageOf(adminUserSchema);

export const listAdminUsersQuerySchema = paginationQuerySchema.extend({
  status: adminUserStatusSchema.optional(),
  search: z.string().max(80).optional(),
});

const adminPasswordSchema = z.string().min(12).max(200);

export const createAdminUserBodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  password: adminPasswordSchema,
  roleKeys: z.array(roleKeySchema).min(1),
});

export const updateAdminUserBodySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.email().optional(),
  status: adminUserStatusPatchSchema.optional(),
});

export const setAdminUserRolesBodySchema = z.object({
  roleKeys: z.array(roleKeySchema),
});

export const setAdminUserPasswordBodySchema = z.object({
  password: adminPasswordSchema,
});

export const changeOwnPasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: adminPasswordSchema,
});

export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Expected a six-digit code');

export const confirmTwoFactorBodySchema = z.object({
  code: totpCodeSchema,
});

export const disableTwoFactorBodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  code: totpCodeSchema,
});

export const twoFactorEnrolmentSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
});

export const roleSchema = z.object({
  id: uuidSchema,
  key: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(permissionKeySchema),
  userCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});

export const createRoleBodySchema = z.object({
  key: roleKeySchema,
  name: z.string().min(2).max(80),
  permissions: z.array(permissionKeySchema),
});

export const updateRoleBodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  permissions: z.array(permissionKeySchema).optional(),
});

export const permissionGroupSchema = z.object({
  group: z.string(),
  permissions: z.array(permissionKeySchema),
});

export const permissionCatalogueSchema = z.array(permissionGroupSchema);

export const adminUserIdParamsSchema = z.object({ userId: uuidSchema });
export const roleIdParamsSchema = z.object({ roleId: uuidSchema });

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserPage = z.infer<typeof adminUserPageSchema>;
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;
export type CreateAdminUserBody = z.infer<typeof createAdminUserBodySchema>;
export type UpdateAdminUserBody = z.infer<typeof updateAdminUserBodySchema>;
export type SetAdminUserRolesBody = z.infer<typeof setAdminUserRolesBodySchema>;
export type SetAdminUserPasswordBody = z.infer<typeof setAdminUserPasswordBodySchema>;
export type ChangeOwnPasswordBody = z.infer<typeof changeOwnPasswordBodySchema>;
export type ConfirmTwoFactorBody = z.infer<typeof confirmTwoFactorBodySchema>;
export type DisableTwoFactorBody = z.infer<typeof disableTwoFactorBodySchema>;
export type TwoFactorEnrolment = z.infer<typeof twoFactorEnrolmentSchema>;
export type Role = z.infer<typeof roleSchema>;
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;
export type PermissionGroup = z.infer<typeof permissionGroupSchema>;
export type PermissionCatalogue = z.infer<typeof permissionCatalogueSchema>;
