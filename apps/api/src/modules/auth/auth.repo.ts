import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import {
  authChallenges,
  memberships,
  projects,
  refreshTokens,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../db/schema.ts';

export type UserRow = typeof users.$inferSelect;

export async function findUserById(userId: string): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'active'), isNull(users.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function findActivePartnerByMobile(mobile: string): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.mobile, mobile),
        eq(users.kind, 'partner'),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findActiveAdminByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email),
        eq(users.kind, 'admin'),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row !== undefined && row.totpEnabledAt !== null;
}

export async function touchLastLogin(userId: string): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export async function permissionKeysForUser(
  userId: string,
): Promise<{ permissions: string[]; roleKeys: string[] }> {
  const rows = await db
    .select({ permission: rolePermissions.permission, roleKey: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const permissions = new Set<string>();
  const roleKeys = new Set<string>();
  for (const row of rows) {
    roleKeys.add(row.roleKey);
    if (row.permission !== null) permissions.add(row.permission);
  }
  return { permissions: [...permissions], roleKeys: [...roleKeys] };
}

export type ActiveMembershipRow = {
  projectId: string;
  code: string;
  name: string;
};

export async function activeMembershipProjects(userId: string): Promise<ActiveMembershipRow[]> {
  return db
    .select({ projectId: projects.id, code: projects.code, name: projects.name })
    .from(memberships)
    .innerJoin(projects, eq(projects.id, memberships.projectId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')))
    .orderBy(projects.code);
}

export type ChallengeRow = typeof authChallenges.$inferSelect;

export async function insertChallenge(row: typeof authChallenges.$inferInsert): Promise<void> {
  await db.insert(authChallenges).values(row);
}

export async function findLiveChallenge(challengeId: string): Promise<ChallengeRow | null> {
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(and(eq(authChallenges.id, challengeId), isNull(authChallenges.consumedAt)))
    .limit(1);
  return row ?? null;
}

export async function recordChallengeAttempt(challengeId: string): Promise<void> {
  await db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(eq(authChallenges.id, challengeId));
}

export async function consumeChallenge(challengeId: string): Promise<void> {
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challengeId));
}

export async function countRecentChallenges(mobile: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(authChallenges)
    .where(and(eq(authChallenges.mobile, mobile), gt(authChallenges.createdAt, since)));
  return row?.total ?? 0;
}

export async function insertRefreshToken(row: typeof refreshTokens.$inferInsert): Promise<void> {
  await db.insert(refreshTokens).values(row);
}

export async function findLiveRefreshToken(
  tokenHash: string,
): Promise<typeof refreshTokens.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(refreshTokens.createdAt))
    .limit(1);
  return row ?? null;
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, tokenId));
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
