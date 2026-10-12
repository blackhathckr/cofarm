import type { EntityType } from '@cofarm/contracts/tracking';
import { and, asc, count, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { indiaDayRange } from '../../lib/india-date.ts';
import { deviceTokens, memberships, notifications, projects } from '../../db/schema.ts';

export type NotificationRow = typeof notifications.$inferSelect;
export type DeviceRow = typeof deviceTokens.$inferSelect;

export type ListFilters = {
  limit: number;
  cursor: string | undefined;
  date: string | undefined;
};

/**
 * Ordered by id rather than created_at: ids are uuid v7, so id order is
 * creation order and a single column serves as a tie-free cursor.
 */
export async function listForUser(
  userId: string,
  filters: ListFilters,
): Promise<NotificationRow[]> {
  const conditions = [eq(notifications.userId, userId)];
  if (filters.cursor !== undefined) {
    conditions.push(lt(notifications.id, filters.cursor));
  }
  if (filters.date !== undefined) {
    const day = indiaDayRange(filters.date);
    conditions.push(gte(notifications.createdAt, day.from), lt(notifications.createdAt, day.to));
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.id))
    .limit(filters.limit);
}

export type NotifiedSinceFilters = {
  userIds: readonly string[];
  type: NotificationRow['type'];
  entityType: NonNullable<NotificationRow['entityType']>;
  entityId: string;
  since: Date;
};

export async function userIdsNotifiedSince(filters: NotifiedSinceFilters): Promise<string[]> {
  if (filters.userIds.length === 0) return [];

  const rows = await db
    .selectDistinct({ userId: notifications.userId })
    .from(notifications)
    .where(
      and(
        inArray(notifications.userId, [...filters.userIds]),
        eq(notifications.type, filters.type),
        eq(notifications.entityType, filters.entityType),
        eq(notifications.entityId, filters.entityId),
        gte(notifications.createdAt, filters.since),
      ),
    );
  return rows.map((row) => row.userId);
}

export async function countUnreadForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.total ?? 0;
}

export async function findForUser(
  userId: string,
  notificationId: string,
): Promise<NotificationRow | null> {
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function markRead(
  userId: string,
  notificationId: string,
  readAt: Date,
): Promise<NotificationRow | null> {
  const [updated] = await db
    .update(notifications)
    .set({ readAt })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function markAllRead(userId: string, readAt: Date): Promise<number> {
  const updated = await db
    .update(notifications)
    .set({ readAt })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return updated.length;
}

export async function deleteForEntity(input: {
  entityType: EntityType;
  entityId: string;
}): Promise<number> {
  const removed = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.entityType, input.entityType),
        eq(notifications.entityId, input.entityId),
      ),
    )
    .returning({ id: notifications.id });
  return removed.length;
}

export async function insertNotifications(
  rows: readonly (typeof notifications.$inferInsert)[],
): Promise<NotificationRow[]> {
  if (rows.length === 0) return [];
  return db
    .insert(notifications)
    .values([...rows])
    .returning();
}

export async function findByIds(notificationIds: readonly string[]): Promise<NotificationRow[]> {
  if (notificationIds.length === 0) return [];
  return db
    .select()
    .from(notifications)
    .where(inArray(notifications.id, [...notificationIds]));
}

export async function projectCodeFor(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ code: projects.code })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return row?.code ?? null;
}

export async function activeMemberUserIds(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.projectId, projectId), eq(memberships.status, 'active')))
    .orderBy(asc(memberships.userId));
  return rows.map((row) => row.userId);
}

export async function markDelivered(
  notificationIds: readonly string[],
  deliveredAt: Date,
): Promise<void> {
  if (notificationIds.length === 0) return;
  await db
    .update(notifications)
    .set({ deliveredAt, deliveryError: null })
    .where(inArray(notifications.id, [...notificationIds]));
}

export async function markDeliveryError(
  notificationIds: readonly string[],
  deliveryError: string,
): Promise<void> {
  if (notificationIds.length === 0) return;
  await db
    .update(notifications)
    .set({ deliveryError })
    .where(inArray(notifications.id, [...notificationIds]));
}

export async function tokensForUsers(
  userIds: readonly string[],
): Promise<{ userId: string; token: string }[]> {
  if (userIds.length === 0) return [];
  return db
    .select({ userId: deviceTokens.userId, token: deviceTokens.token })
    .from(deviceTokens)
    .where(inArray(deviceTokens.userId, [...userIds]));
}

/**
 * Conflict is on the token alone: a handset passed to another partner must
 * follow the new owner, never keep pushing to the old one.
 */
export async function upsertDeviceToken(row: typeof deviceTokens.$inferInsert): Promise<DeviceRow> {
  const [saved] = await db
    .insert(deviceTokens)
    .values(row)
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { userId: row.userId, platform: row.platform, lastSeenAt: row.lastSeenAt ?? new Date() },
    })
    .returning();
  if (saved === undefined) throw new Error('Upsert returned no device token row');
  return saved;
}

export async function deleteTokens(tokens: readonly string[]): Promise<number> {
  if (tokens.length === 0) return 0;

  const removed = await db
    .delete(deviceTokens)
    .where(inArray(deviceTokens.token, [...tokens]))
    .returning({ id: deviceTokens.id });
  return removed.length;
}

export async function deleteDeviceToken(userId: string, token: string): Promise<number> {
  const removed = await db
    .delete(deviceTokens)
    .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)))
    .returning({ id: deviceTokens.id });
  return removed.length;
}
