import {
  adminUserPageSchema,
  adminUserSchema,
  permissionCatalogueSchema,
  roleSchema,
  twoFactorEnrolmentSchema,
  type ChangeOwnPasswordBody,
  type ConfirmTwoFactorBody,
  type CreateAdminUserBody,
  type CreateRoleBody,
  type DisableTwoFactorBody,
  type ListAdminUsersQuery,
  type SetAdminUserPasswordBody,
  type SetAdminUserRolesBody,
  type UpdateAdminUserBody,
  type UpdateRoleBody,
} from '@cofarm/contracts/admin-users';
import { okSchema } from '@cofarm/contracts/primitives';
import { z } from 'zod';

import { request } from '@/lib/api-client.ts';

const roleListSchema = z.array(roleSchema);

export function fetchAdminUsers(query: Partial<ListAdminUsersQuery> = {}) {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.search !== undefined && query.search !== '') params.set('search', query.search);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 50));

  return request(`/v1/admin/users?${params.toString()}`, adminUserPageSchema);
}

export function createAdminUser(body: CreateAdminUserBody) {
  return request('/v1/admin/users', adminUserSchema, { method: 'POST', body });
}

export function updateAdminUser(userId: string, body: UpdateAdminUserBody) {
  return request(`/v1/admin/users/${userId}`, adminUserSchema, { method: 'PATCH', body });
}

export function setAdminUserRoles(userId: string, body: SetAdminUserRolesBody) {
  return request(`/v1/admin/users/${userId}/roles`, adminUserSchema, { method: 'POST', body });
}

export function setAdminUserPassword(userId: string, body: SetAdminUserPasswordBody) {
  return request(`/v1/admin/users/${userId}/password`, okSchema, { method: 'POST', body });
}

export function deleteAdminUser(userId: string) {
  return request(`/v1/admin/users/${userId}`, adminUserSchema, { method: 'DELETE' });
}

export function fetchRoles() {
  return request('/v1/admin/roles', roleListSchema);
}

export function createRole(body: CreateRoleBody) {
  return request('/v1/admin/roles', roleSchema, { method: 'POST', body });
}

export function updateRole(roleId: string, body: UpdateRoleBody) {
  return request(`/v1/admin/roles/${roleId}`, roleSchema, { method: 'PATCH', body });
}

export function deleteRole(roleId: string) {
  return request(`/v1/admin/roles/${roleId}`, okSchema, { method: 'DELETE' });
}

export function fetchPermissionCatalogue() {
  return request('/v1/admin/permissions', permissionCatalogueSchema);
}

export function enrolTwoFactor() {
  return request('/v1/me/2fa/enrol', twoFactorEnrolmentSchema, { method: 'POST' });
}

export function confirmTwoFactor(body: ConfirmTwoFactorBody) {
  return request('/v1/me/2fa/confirm', okSchema, { method: 'POST', body });
}

export function disableTwoFactor(body: DisableTwoFactorBody) {
  return request('/v1/me/2fa/disable', okSchema, { method: 'POST', body });
}

export function changeOwnPassword(body: ChangeOwnPasswordBody) {
  return request('/v1/me/password', okSchema, { method: 'POST', body });
}
