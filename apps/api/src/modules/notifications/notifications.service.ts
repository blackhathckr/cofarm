import type {
  Device,
  DevicePlatform,
  ListNotificationsQuery,
  Notification,
  NotificationPage,
  NotificationType,
  ReadAllResult,
} from '@cofarm/contracts/notifications';
import type { EntityType } from '@cofarm/contracts/tracking';
import { newId } from '@cofarm/core/id';

import { notFound } from '../../lib/errors.ts';
import { logger } from '../../lib/logger.ts';
import * as jobs from '../jobs/jobs.service.ts';

import * as repo from './notifications.repo.ts';

export const PUSH_FANOUT_JOB = 'push-fanout';

export type NotificationContent = {
  type: NotificationType;
  title: string;
  body: string;
  entityType?: EntityType;
  entityId?: string;
  payload?: Record<string, string>;
};

export type NotifyProjectPartnersInput = NotificationContent & { projectId: string };

export type NotifyUserInput = NotificationContent & {
  userId: string;
  projectId: string | null;
};

export type RegisterDeviceInput = {
  userId: string;
  token: string;
  platform: DevicePlatform;
};

export type PendingDelivery = {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  tokens: string[];
};

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<NotificationPage> {
  const [rows, unreadCount] = await Promise.all([
    repo.listForUser(userId, { limit: query.limit + 1, cursor: query.cursor, date: query.date }),
    repo.countUnreadForUser(userId),
  ]);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    items: page.map(toNotificationDto),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    unreadCount,
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<Notification> {
  const updated = await repo.markRead(userId, notificationId, new Date());
  if (updated !== null) return toNotificationDto(updated);

  const existing = await repo.findForUser(userId, notificationId);
  if (existing === null) throw notFound('Notification');
  return toNotificationDto(existing);
}

export async function markAllNotificationsRead(userId: string): Promise<ReadAllResult> {
  const updated = await repo.markAllRead(userId, new Date());
  return { updated };
}

export async function registerDevice(input: RegisterDeviceInput): Promise<Device> {
  const now = new Date();
  const saved = await repo.upsertDeviceToken({
    id: newId(),
    userId: input.userId,
    token: input.token,
    platform: input.platform,
    lastSeenAt: now,
  });

  return {
    id: saved.id,
    token: saved.token,
    platform: saved.platform,
    lastSeenAt: saved.lastSeenAt.toISOString(),
    createdAt: saved.createdAt.toISOString(),
  };
}

export async function unregisterDevice(userId: string, token: string): Promise<void> {
  const removed = await repo.deleteDeviceToken(userId, token);
  if (removed === 0) {
    logger.debug({ userId }, 'device token was already unregistered');
  }
}

/**
 * Drops the notifications for an artefact that no longer exists, so a partner
 * tapping one is not deep-linked to a dead record.
 */
/** Drops tokens FCM reported as gone, so the next fan-out does not retry them. */
export async function forgetTokens(tokens: readonly string[]): Promise<number> {
  return repo.deleteTokens(tokens);
}

export async function discardForEntity(input: {
  entityType: EntityType;
  entityId: string;
}): Promise<number> {
  return repo.deleteForEntity(input);
}

/**
 * A partner can hold several projects, so a fan-out notification has to say
 * which one it is about. The single-recipient notifications already name it.
 */
export async function notifyProjectPartners(input: NotifyProjectPartnersInput): Promise<string[]> {
  const [userIds, projectCode] = await Promise.all([
    repo.activeMemberUserIds(input.projectId),
    repo.projectCodeFor(input.projectId),
  ]);
  if (userIds.length === 0) {
    logger.info(
      { projectId: input.projectId, notificationType: input.type },
      'project has no active membership to notify',
    );
    return [];
  }

  const rows = await repo.insertNotifications(
    userIds.map((userId) => ({
      id: newId(),
      userId,
      projectId: input.projectId,
      type: input.type,
      title: projectCode === null ? input.title : `${projectCode} · ${input.title}`,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? {},
    })),
  );

  const notificationIds = rows.map((row) => row.id);
  await enqueueFanout(notificationIds);
  return notificationIds;
}

export async function notifyUser(input: NotifyUserInput): Promise<string[]> {
  const rows = await repo.insertNotifications([
    {
      id: newId(),
      userId: input.userId,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? {},
    },
  ]);

  const notificationIds = rows.map((row) => row.id);
  await enqueueFanout(notificationIds);
  return notificationIds;
}

export type NotifiedSinceInput = {
  userIds: readonly string[];
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  since: Date;
};

/** Which of these users already holds a notification of this kind for the
 * entity, so a repeated fan-out does not reach the same person twice. */
export async function usersNotifiedSince(input: NotifiedSinceInput): Promise<Set<string>> {
  const userIds = await repo.userIdsNotifiedSince({
    userIds: input.userIds,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    since: input.since,
  });
  return new Set(userIds);
}

export async function pendingDeliveries(
  notificationIds: readonly string[],
): Promise<PendingDelivery[]> {
  const rows = await repo.findByIds(notificationIds);
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.userId))];
  const tokenRows = await repo.tokensForUsers(userIds);

  const tokensByUser = new Map<string, string[]>();
  for (const tokenRow of tokenRows) {
    const existing = tokensByUser.get(tokenRow.userId);
    if (existing === undefined) {
      tokensByUser.set(tokenRow.userId, [tokenRow.token]);
      continue;
    }
    existing.push(tokenRow.token);
  }

  return rows.map((row) => ({
    notificationId: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    data: {
      ...row.payload,
      notificationId: row.id,
      notificationType: row.type,
      ...(row.projectId === null ? {} : { projectId: row.projectId }),
      ...(row.entityType === null ? {} : { entityType: row.entityType }),
      ...(row.entityId === null ? {} : { entityId: row.entityId }),
    },
    tokens: tokensByUser.get(row.userId) ?? [],
  }));
}

export async function recordDelivered(notificationIds: readonly string[]): Promise<void> {
  await repo.markDelivered(notificationIds, new Date());
}

export async function recordDeliveryFailure(
  notificationIds: readonly string[],
  error: string,
): Promise<void> {
  await repo.markDeliveryError(notificationIds, error);
}

/**
 * No dedupe key: `jobs_dedupe_key_key` is unique for the lifetime of the
 * table, so a reusable key would reject every later fan-out.
 */
async function enqueueFanout(notificationIds: readonly string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  await jobs.enqueue({
    type: PUSH_FANOUT_JOB,
    payload: { notificationIds: [...notificationIds] },
  });
}

function toNotificationDto(row: repo.NotificationRow): Notification {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload,
    readAt: row.readAt === null ? null : row.readAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
