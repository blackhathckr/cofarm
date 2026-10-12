import type {
  AdminUser,
  AdminUserPage,
  ChangeOwnPasswordBody,
  CreateAdminUserBody,
  CreateRoleBody,
  ListAdminUsersQuery,
  PermissionGroup,
  Role,
  TwoFactorEnrolment,
  UpdateAdminUserBody,
  UpdateRoleBody,
} from '@cofarm/contracts/admin-users';
import { ERROR_CODES } from '@cofarm/contracts/errors';
import { ALL_PERMISSIONS, SYSTEM_ROLES, type Permission } from '@cofarm/contracts/permissions';
import { newId } from '@cofarm/core/id';

import { AppError, badRequest, conflict, notFound } from '../../lib/errors.ts';
import { hashPassword, verifyPassword } from '../../lib/password.ts';
import { pickDefined } from '../../lib/patch.ts';
import { generateTotpSecret, totpEnrolmentUrl, verifyTotp } from '../../lib/totp.ts';
import * as audit from '../audit/audit.service.ts';
import * as authService from '../auth/auth.service.ts';
import * as repo from './admin-users.repo.ts';

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set<string>(ALL_PERMISSIONS);

export async function listAdminUsers(query: ListAdminUsersQuery): Promise<AdminUserPage> {
  const rows = await repo.listAdminUsers({
    status: query.status,
    search: query.search,
    cursor: query.cursor,
    limit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const roleKeys = await roleKeysByUser(page.map((row) => row.id));

  return {
    items: page.map((row) => toAdminUser(row, roleKeys.get(row.id) ?? [])),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function createAdminUser(input: CreateAdminUserBody): Promise<AdminUser> {
  const taken = await repo.findUserIdByEmail(input.email);
  if (taken !== null) {
    throw conflict(ERROR_CODES.emailTaken, `${input.email} already belongs to an account`);
  }

  const roleIds = await resolveRoleIds(input.roleKeys);
  const created = await repo.insertAdminUser({
    id: newId(),
    kind: 'admin',
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  await repo.replaceUserRoles(created.id, roleIds);

  const user = toAdminUser(created, [...new Set(input.roleKeys)].sort());
  await audit.record({
    action: 'admin_user.created',
    entityTable: 'users',
    entityId: user.id,
    projectId: null,
    after: user,
  });

  return user;
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminUserBody,
): Promise<AdminUser> {
  const before = await loadAdminUser(userId);

  if (input.email !== undefined && input.email !== before.email) {
    const taken = await repo.findUserIdByEmail(input.email);
    if (taken !== null) {
      throw conflict(ERROR_CODES.emailTaken, `${input.email} already belongs to an account`);
    }
  }
  if (input.status === 'suspended') {
    await assertSuperadminSurvives(userId, null);
  }

  const updated = await repo.updateAdminUser(
    userId,
    pickDefined({ name: input.name, email: input.email, status: input.status }),
  );
  if (updated === null) throw notFound('Admin user');

  const roleKeys = await roleKeysFor(userId);
  const user = toAdminUser(updated, roleKeys);
  await audit.record({
    action: 'admin_user.updated',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
    before: toAdminUser(before, roleKeys),
    after: user,
  });

  return user;
}

export async function replaceAdminUserRoles(
  userId: string,
  roleKeys: readonly string[],
): Promise<AdminUser> {
  const row = await loadAdminUser(userId);
  const previousKeys = await roleKeysFor(userId);
  await assertSuperadminSurvives(userId, roleKeys);

  const roleIds = await resolveRoleIds(roleKeys);
  await repo.replaceUserRoles(userId, roleIds);

  const nextKeys = await roleKeysFor(userId);
  await audit.record({
    action: 'admin_user.roles_changed',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
    before: { roleKeys: previousKeys },
    after: { roleKeys: nextKeys },
  });

  return toAdminUser(row, nextKeys);
}

export async function setAdminUserPassword(userId: string, password: string): Promise<void> {
  await loadAdminUser(userId);
  await writePassword(userId, password);
}

export async function deleteAdminUser(userId: string): Promise<AdminUser> {
  const before = await loadAdminUser(userId);
  await assertSuperadminSurvives(userId, null);

  const updated = await repo.updateAdminUser(userId, {
    status: 'deleted',
    deletedAt: new Date(),
  });
  if (updated === null) throw notFound('Admin user');

  await authService.logoutEverywhere(userId);

  const roleKeys = await roleKeysFor(userId);
  const user = toAdminUser(updated, roleKeys);
  await audit.record({
    action: 'admin_user.deleted',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
    before: toAdminUser(before, roleKeys),
    after: user,
  });

  return user;
}

export async function enrolTwoFactor(userId: string): Promise<TwoFactorEnrolment> {
  const row = await loadAdminUser(userId);
  if (row.totpEnabledAt !== null) {
    throw conflict(ERROR_CODES.twoFactorRequired, 'Two-factor is already enabled on this account');
  }

  // Stored unconfirmed: `totpEnabledAt` stays null until a code round-trips, so
  // a half-finished enrolment cannot lock the account out at the next login.
  const secret = generateTotpSecret();
  const updated = await repo.updateAdminUser(userId, { totpSecret: secret });
  if (updated === null) throw notFound('Admin user');

  return {
    secret,
    otpauthUrl: totpEnrolmentUrl(secret, row.email ?? row.name),
  };
}

export async function confirmTwoFactor(userId: string, code: string): Promise<void> {
  await loadAdminUser(userId);
  const secrets = await repo.findAdminSecrets(userId);
  if (secrets === null) throw notFound('Admin user');
  if (secrets.totpEnabledAt !== null) {
    throw conflict(ERROR_CODES.twoFactorRequired, 'Two-factor is already enabled on this account');
  }
  if (secrets.totpSecret === null) {
    throw badRequest('Start two-factor enrolment before confirming a code');
  }
  if (!verifyTotp(secrets.totpSecret, code)) {
    throw new AppError(ERROR_CODES.twoFactorInvalid, 400, 'That authenticator code is wrong');
  }

  await repo.updateAdminUser(userId, { totpEnabledAt: new Date() });
  await audit.record({
    action: 'two_factor.enrolled',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
  });
}

export async function disableTwoFactor(
  userId: string,
  currentPassword: string,
  code: string,
): Promise<void> {
  await loadAdminUser(userId);
  const secrets = await repo.findAdminSecrets(userId);
  if (secrets === null) throw notFound('Admin user');

  await assertCurrentPassword(secrets.passwordHash, currentPassword);
  if (secrets.totpEnabledAt === null || secrets.totpSecret === null) {
    throw conflict(ERROR_CODES.twoFactorInvalid, 'Two-factor is not enabled on this account');
  }
  if (!verifyTotp(secrets.totpSecret, code)) {
    throw new AppError(ERROR_CODES.twoFactorInvalid, 400, 'That authenticator code is wrong');
  }

  await repo.updateAdminUser(userId, { totpSecret: null, totpEnabledAt: null });
  await audit.record({
    action: 'two_factor.disabled',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
  });
}

export async function changeOwnPassword(
  userId: string,
  input: ChangeOwnPasswordBody,
): Promise<void> {
  await loadAdminUser(userId);
  const secrets = await repo.findAdminSecrets(userId);
  if (secrets === null) throw notFound('Admin user');

  await assertCurrentPassword(secrets.passwordHash, input.currentPassword);
  await writePassword(userId, input.newPassword);
}

export async function listRoles(): Promise<Role[]> {
  const rows = await repo.listRoles();
  const [permissions, counts] = await Promise.all([
    repo.permissionsForRoles(rows.map((row) => row.id)),
    repo.userCountsByRole(),
  ]);

  const byRole = new Map<string, Permission[]>();
  for (const row of permissions) {
    if (!isPermission(row.permission)) continue;
    const bucket = byRole.get(row.roleId);
    if (bucket === undefined) byRole.set(row.roleId, [row.permission]);
    else bucket.push(row.permission);
  }
  const countByRole = new Map(counts.map((row) => [row.roleId, row.total]));

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissions: byRole.get(row.id) ?? [],
    userCount: countByRole.get(row.id) ?? 0,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createRole(input: CreateRoleBody): Promise<Role> {
  const existing = await repo.findRoleByKey(input.key);
  if (existing !== null) {
    throw conflict(ERROR_CODES.roleKeyTaken, `Role key ${input.key} is already in use`);
  }

  const created = await repo.insertRole({ id: newId(), key: input.key, name: input.name });
  const permissions = [...new Set(input.permissions)];
  await repo.replaceRolePermissions(created.id, permissions);

  const role = await loadRole(created.id);
  await audit.record({
    action: 'role.created',
    entityTable: 'roles',
    entityId: role.id,
    projectId: null,
    after: role,
  });

  return role;
}

export async function updateRole(roleId: string, input: UpdateRoleBody): Promise<Role> {
  const before = await loadRole(roleId);
  assertNotSystemRole(before);

  if (input.name !== undefined) {
    const updated = await repo.updateRole(roleId, { name: input.name });
    if (updated === null) throw notFound('Role');
  }
  if (input.permissions !== undefined) {
    await repo.replaceRolePermissions(roleId, [...new Set(input.permissions)]);
  }

  const role = await loadRole(roleId);
  await audit.record({
    action: 'role.updated',
    entityTable: 'roles',
    entityId: roleId,
    projectId: null,
    before,
    after: role,
  });

  return role;
}

export async function deleteRole(roleId: string): Promise<void> {
  const role = await loadRole(roleId);
  assertNotSystemRole(role);

  if (role.userCount > 0) {
    throw conflict(
      ERROR_CODES.roleInUse,
      `Role ${role.key} is still assigned to ${role.userCount} account(s)`,
      'Move those accounts to another role first.',
    );
  }

  await repo.deleteRole(roleId);
  await audit.record({
    action: 'role.deleted',
    entityTable: 'roles',
    entityId: roleId,
    projectId: null,
    before: role,
  });
}

export function permissionCatalogue(): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();
  for (const permission of ALL_PERMISSIONS) {
    const [group = permission] = permission.split('.');
    const bucket = groups.get(group);
    if (bucket === undefined) groups.set(group, [permission]);
    else bucket.push(permission);
  }
  return [...groups].map(([group, permissions]) => ({ group, permissions }));
}

function toAdminUser(row: repo.AdminUserRow, roleKeys: readonly string[]): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    roleKeys: [...roleKeys],
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    twoFactorEnabled: row.totpEnabledAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadAdminUser(userId: string): Promise<repo.AdminUserRow> {
  const row = await repo.findAdminUser(userId);
  if (row === null) throw notFound('Admin user');
  return row;
}

async function loadRole(roleId: string): Promise<Role> {
  const row = await repo.findRole(roleId);
  if (row === null) throw notFound('Role');

  const [permissions, userCount] = await Promise.all([
    repo.permissionsForRoles([roleId]),
    repo.countUsersWithRole(roleId),
  ]);

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissions: permissions.map((entry) => entry.permission).filter(isPermission),
    userCount,
    createdAt: row.createdAt.toISOString(),
  };
}

function assertNotSystemRole(role: Role): void {
  if (role.isSystem) {
    throw conflict(
      ERROR_CODES.roleIsSystem,
      `${role.name} is a built-in role and cannot be changed`,
      'Create a role of your own with the permissions you need.',
    );
  }
}

async function roleKeysFor(userId: string): Promise<string[]> {
  const rows = await repo.roleKeysForUsers([userId]);
  return rows.map((row) => row.roleKey);
}

async function roleKeysByUser(userIds: readonly string[]): Promise<Map<string, string[]>> {
  const rows = await repo.roleKeysForUsers(userIds);
  const keys = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = keys.get(row.userId);
    if (bucket === undefined) keys.set(row.userId, [row.roleKey]);
    else bucket.push(row.roleKey);
  }
  return keys;
}

async function resolveRoleIds(roleKeys: readonly string[]): Promise<string[]> {
  const wanted = [...new Set(roleKeys)];
  const found = await repo.findRolesByKeys(wanted);
  if (found.length !== wanted.length) {
    const known = new Set(found.map((role) => role.key));
    const missing = wanted.filter((key) => !known.has(key));
    throw badRequest(`Unknown role keys: ${missing.join(', ')}`);
  }
  return found.map((role) => role.id);
}

/**
 * The console cannot grant itself back in, so the last account that still holds
 * the superadmin role may not be suspended, deleted, or demoted.
 */
async function assertSuperadminSurvives(
  userId: string,
  nextRoleKeys: readonly string[] | null,
): Promise<void> {
  const currentKeys = await roleKeysFor(userId);
  if (!currentKeys.includes(SYSTEM_ROLES.superadmin)) return;
  if (nextRoleKeys?.includes(SYSTEM_ROLES.superadmin) === true) return;

  const others = await repo.countActiveUsersWithRoleKey(SYSTEM_ROLES.superadmin, userId);
  if (others === 0) {
    throw conflict(
      ERROR_CODES.lastSuperadmin,
      'This is the last active superadmin',
      'Give another account the superadmin role first.',
    );
  }
}

async function assertCurrentPassword(storedHash: string | null, candidate: string): Promise<void> {
  if (storedHash === null || !(await verifyPassword(candidate, storedHash))) {
    throw new AppError(ERROR_CODES.credentialsInvalid, 401, 'Current password is wrong');
  }
}

async function writePassword(userId: string, password: string): Promise<void> {
  const updated = await repo.updateAdminUser(userId, {
    passwordHash: await hashPassword(password),
  });
  if (updated === null) throw notFound('Admin user');

  await authService.logoutEverywhere(userId);
  await audit.record({
    action: 'admin_user.password_changed',
    entityTable: 'users',
    entityId: userId,
    projectId: null,
  });
}

function isPermission(key: string): key is Permission {
  return KNOWN_PERMISSIONS.has(key);
}
