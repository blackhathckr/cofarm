import type {
  AdminUser,
  AdminUserPage,
  ChangeOwnPasswordBody,
  ConfirmTwoFactorBody,
  CreateAdminUserBody,
  CreateRoleBody,
  DisableTwoFactorBody,
  ListAdminUsersQuery,
  PermissionGroup,
  Role,
  SetAdminUserPasswordBody,
  SetAdminUserRolesBody,
  TwoFactorEnrolment,
  UpdateAdminUserBody,
  UpdateRoleBody,
} from '@cofarm/contracts/admin-users';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import * as service from './admin-users.service.ts';

type AdminUserParams = { userId: string };
type RoleParams = { roleId: string };

export async function listUsers(
  request: FastifyRequest<{ Querystring: ListAdminUsersQuery }>,
): Promise<AdminUserPage> {
  return service.listAdminUsers(request.query);
}

export async function createUser(
  request: FastifyRequest<{ Body: CreateAdminUserBody }>,
  reply: FastifyReply,
): Promise<AdminUser> {
  const user = await service.createAdminUser(request.body);
  void reply.status(201);
  return user;
}

export async function updateUser(
  request: FastifyRequest<{ Params: AdminUserParams; Body: UpdateAdminUserBody }>,
): Promise<AdminUser> {
  return service.updateAdminUser(request.params.userId, request.body);
}

export async function setUserRoles(
  request: FastifyRequest<{ Params: AdminUserParams; Body: SetAdminUserRolesBody }>,
): Promise<AdminUser> {
  return service.replaceAdminUserRoles(request.params.userId, request.body.roleKeys);
}

export async function setUserPassword(
  request: FastifyRequest<{ Params: AdminUserParams; Body: SetAdminUserPasswordBody }>,
): Promise<{ ok: true }> {
  await service.setAdminUserPassword(request.params.userId, request.body.password);
  return { ok: true };
}

export async function deleteUser(
  request: FastifyRequest<{ Params: AdminUserParams }>,
): Promise<AdminUser> {
  return service.deleteAdminUser(request.params.userId);
}

export async function enrolTwoFactor(request: FastifyRequest): Promise<TwoFactorEnrolment> {
  return service.enrolTwoFactor(assertActor(request.actor).userId);
}

export async function confirmTwoFactor(
  request: FastifyRequest<{ Body: ConfirmTwoFactorBody }>,
): Promise<{ ok: true }> {
  await service.confirmTwoFactor(assertActor(request.actor).userId, request.body.code);
  return { ok: true };
}

export async function disableTwoFactor(
  request: FastifyRequest<{ Body: DisableTwoFactorBody }>,
): Promise<{ ok: true }> {
  await service.disableTwoFactor(
    assertActor(request.actor).userId,
    request.body.currentPassword,
    request.body.code,
  );
  return { ok: true };
}

export async function changeOwnPassword(
  request: FastifyRequest<{ Body: ChangeOwnPasswordBody }>,
): Promise<{ ok: true }> {
  await service.changeOwnPassword(assertActor(request.actor).userId, request.body);
  return { ok: true };
}

export async function listRoles(): Promise<Role[]> {
  return service.listRoles();
}

export async function createRole(
  request: FastifyRequest<{ Body: CreateRoleBody }>,
  reply: FastifyReply,
): Promise<Role> {
  const role = await service.createRole(request.body);
  void reply.status(201);
  return role;
}

export async function updateRole(
  request: FastifyRequest<{ Params: RoleParams; Body: UpdateRoleBody }>,
): Promise<Role> {
  return service.updateRole(request.params.roleId, request.body);
}

export async function deleteRole(
  request: FastifyRequest<{ Params: RoleParams }>,
): Promise<{ ok: true }> {
  await service.deleteRole(request.params.roleId);
  return { ok: true };
}

export function listPermissions(): PermissionGroup[] {
  return service.permissionCatalogue();
}
