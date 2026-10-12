import { and, eq, isNull, ne } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { deviceTokens, refreshTokens, users } from '../../db/schema.ts';

export type UserRow = typeof users.$inferSelect;

export async function findUser(userId: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

/** The email uniqueness index spans every account, partners and admins alike. */
export async function findOtherUserIdByEmail(
  userId: string,
  email: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  return row?.id ?? null;
}

export async function updateUser(
  userId: string,
  patch: Partial<typeof users.$inferInsert>,
): Promise<UserRow | null> {
  const [updated] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function revokeRefreshTokens(userId: string, now: Date): Promise<number> {
  const revoked = await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  return revoked.length;
}

export async function deleteDeviceTokens(userId: string): Promise<number> {
  const removed = await db
    .delete(deviceTokens)
    .where(eq(deviceTokens.userId, userId))
    .returning({ id: deviceTokens.id });
  return removed.length;
}
