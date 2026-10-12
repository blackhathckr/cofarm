import {
  ALL_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from '@cofarm/contracts/permissions';
import { newId } from '@cofarm/core/id';

import { env } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { hashPassword } from '../lib/password.ts';
import { closeDatabase, db } from './client.ts';
import { rolePermissions, roles, userRoles, users } from './schema.ts';

/**
 * The only rows a live database may start with: the system roles with their
 * permissions, and one superadmin to create everything else from. Safe to
 * re-run — it adds whatever is missing and leaves existing rows alone.
 */
async function seedRoles(): Promise<Map<string, string>> {
  const existing = await db.select({ id: roles.id, key: roles.key }).from(roles);
  const roleIds = new Map(existing.map((role) => [role.key, role.id]));

  for (const key of Object.values(SYSTEM_ROLES)) {
    if (roleIds.has(key)) continue;

    const id = newId();
    roleIds.set(key, id);
    await db
      .insert(roles)
      .values({ id, key, name: key.charAt(0).toUpperCase() + key.slice(1), isSystem: true });

    const granted =
      key === SYSTEM_ROLES.superadmin ? ALL_PERMISSIONS : (SYSTEM_ROLE_PERMISSIONS[key] ?? []);
    if (granted.length > 0) {
      await db
        .insert(rolePermissions)
        .values(granted.map((permission) => ({ roleId: id, permission })));
    }
  }

  return roleIds;
}

async function seedSuperadmin(roleIds: Map<string, string>): Promise<boolean> {
  const [already] = await db.select({ id: users.id }).from(users).limit(1);
  if (already !== undefined) return false;

  const adminId = newId();
  await db.insert(users).values({
    id: adminId,
    kind: 'admin',
    name: 'CoFarm Superadmin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
  });

  const superadminRoleId = roleIds.get(SYSTEM_ROLES.superadmin);
  if (superadminRoleId === undefined) throw new Error('Superadmin role was not seeded');
  await db.insert(userRoles).values({ userId: adminId, roleId: superadminRoleId });
  return true;
}

try {
  const roleIds = await seedRoles();
  const created = await seedSuperadmin(roleIds);

  logger.info(
    {
      roles: [...roleIds.keys()],
      permissions: ALL_PERMISSIONS.length,
      superadmin: created ? env.SEED_ADMIN_EMAIL : 'already present, left alone',
    },
    'production seed complete',
  );
} finally {
  await closeDatabase();
}
