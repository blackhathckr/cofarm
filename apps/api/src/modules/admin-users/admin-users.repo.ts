import { and, asc, count, eq, gt, ilike, inArray, isNull, ne, or, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { rolePermissions, roles, userRoles, users } from '../../db/schema.ts';

const adminUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  totpEnabledAt: users.totpEnabledAt,
  createdAt: users.createdAt,
} as const;

/** The projection every read returns: `passwordHash` and `totpSecret` are not in it. */
export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  status: (typeof users.$inferSelect)['status'];
  lastLoginAt: Date | null;
  totpEnabledAt: Date | null;
  createdAt: Date;
};

export type AdminUserSecrets = {
  passwordHash: string | null;
  totpSecret: string | null;
  totpEnabledAt: Date | null;
};

export type RoleRow = typeof roles.$inferSelect;

export type AdminUserFilters = {
  status: AdminUserRow['status'] | undefined;
  search: string | undefined;
  limit: number;
  cursor: string | undefined;
};

export async function listAdminUsers(filters: AdminUserFilters): Promise<AdminUserRow[]> {
  const conditions: SQL[] = [eq(users.kind, 'admin')];

  if (filters.status === undefined) {
    conditions.push(isNull(users.deletedAt));
  } else {
    conditions.push(eq(users.status, filters.status));
  }
  if (filters.search !== undefined && filters.search.length > 0) {
    const term = `%${filters.search}%`;
    const match = or(ilike(users.name, term), ilike(users.email, term));
    if (match !== undefined) conditions.push(match);
  }
  if (filters.cursor !== undefined) {
    conditions.push(gt(users.id, filters.cursor));
  }

  return db
    .select(adminUserColumns)
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.id))
    .limit(filters.limit);
}

export async function findAdminUser(userId: string): Promise<AdminUserRow | null> {
  const [row] = await db
    .select(adminUserColumns)
    .from(users)
    .where(and(eq(users.id, userId), eq(users.kind, 'admin'), isNull(users.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function findAdminSecrets(userId: string): Promise<AdminUserSecrets | null> {
  const [row] = await db
    .select({
      passwordHash: users.passwordHash,
      totpSecret: users.totpSecret,
      totpEnabledAt: users.totpEnabledAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.kind, 'admin'), isNull(users.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Any kind and any status: the email unique index spans partners and
 * soft-deleted rows, so a match there still blocks the insert.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row?.id ?? null;
}

export async function insertAdminUser(row: typeof users.$inferInsert): Promise<AdminUserRow> {
  const [created] = await db.insert(users).values(row).returning(adminUserColumns);
  if (created === undefined) throw new Error('Insert returned no admin user row');
  return created;
}

export async function updateAdminUser(
  userId: string,
  patch: Partial<typeof users.$inferInsert>,
): Promise<AdminUserRow | null> {
  const [updated] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.kind, 'admin')))
    .returning(adminUserColumns);
  return updated ?? null;
}

export async function countActiveUsersWithRoleKey(
  roleKey: string,
  excludeUserId: string | null,
): Promise<number> {
  const conditions: SQL[] = [
    eq(roles.key, roleKey),
    eq(users.status, 'active'),
    isNull(users.deletedAt),
  ];
  if (excludeUserId !== null) {
    conditions.push(ne(users.id, excludeUserId));
  }

  const [row] = await db
    .select({ total: count() })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(...conditions));
  return row?.total ?? 0;
}

export type UserRoleKeyRow = { userId: string; roleKey: string };

export async function roleKeysForUsers(userIds: readonly string[]): Promise<UserRoleKeyRow[]> {
  if (userIds.length === 0) return [];
  return db
    .select({ userId: userRoles.userId, roleKey: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, [...userIds]))
    .orderBy(asc(roles.key));
}

export async function replaceUserRoles(userId: string, roleIds: readonly string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length > 0) {
      await tx.insert(userRoles).values(roleIds.map((roleId) => ({ userId, roleId })));
    }
  });
}

export async function listRoles(): Promise<RoleRow[]> {
  return db.select().from(roles).orderBy(asc(roles.key));
}

export async function findRole(roleId: string): Promise<RoleRow | null> {
  const [row] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  return row ?? null;
}

export async function findRoleByKey(key: string): Promise<RoleRow | null> {
  const [row] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
  return row ?? null;
}

export async function findRolesByKeys(keys: readonly string[]): Promise<RoleRow[]> {
  if (keys.length === 0) return [];
  return db
    .select()
    .from(roles)
    .where(inArray(roles.key, [...keys]));
}

export async function insertRole(row: typeof roles.$inferInsert): Promise<RoleRow> {
  const [created] = await db.insert(roles).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no role row');
  return created;
}

export async function updateRole(
  roleId: string,
  patch: Partial<typeof roles.$inferInsert>,
): Promise<RoleRow | null> {
  const [updated] = await db.update(roles).set(patch).where(eq(roles.id, roleId)).returning();
  return updated ?? null;
}

export async function deleteRole(roleId: string): Promise<void> {
  await db.delete(roles).where(eq(roles.id, roleId));
}

export type RolePermissionRow = { roleId: string; permission: string };

export async function permissionsForRoles(
  roleIds: readonly string[],
): Promise<RolePermissionRow[]> {
  if (roleIds.length === 0) return [];
  return db
    .select({ roleId: rolePermissions.roleId, permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, [...roleIds]))
    .orderBy(asc(rolePermissions.permission));
}

export async function replaceRolePermissions(
  roleId: string,
  permissions: readonly string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissions.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(permissions.map((permission) => ({ roleId, permission })));
    }
  });
}

export type RoleUserCountRow = { roleId: string; total: number };

export async function userCountsByRole(): Promise<RoleUserCountRow[]> {
  return db
    .select({ roleId: userRoles.roleId, total: count() })
    .from(userRoles)
    .groupBy(userRoles.roleId);
}

export async function countUsersWithRole(roleId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId));
  return row?.total ?? 0;
}
