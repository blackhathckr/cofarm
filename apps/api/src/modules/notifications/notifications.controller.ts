import type {
  Device,
  ListNotificationsQuery,
  Notification,
  NotificationPage,
  ReadAllResult,
  RegisterDeviceBody,
} from '@cofarm/contracts/notifications';
import type { FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';

import * as service from './notifications.service.ts';

type NotificationParams = { notificationId: string };
type DeviceTokenParams = { token: string };

export async function list(
  request: FastifyRequest<{ Querystring: ListNotificationsQuery }>,
): Promise<NotificationPage> {
  return service.listNotifications(assertActor(request.actor).userId, request.query);
}

export async function markRead(
  request: FastifyRequest<{ Params: NotificationParams }>,
): Promise<Notification> {
  return service.markNotificationRead(
    assertActor(request.actor).userId,
    request.params.notificationId,
  );
}

export async function markAllRead(request: FastifyRequest): Promise<ReadAllResult> {
  return service.markAllNotificationsRead(assertActor(request.actor).userId);
}

export async function registerDevice(
  request: FastifyRequest<{ Body: RegisterDeviceBody }>,
): Promise<Device> {
  return service.registerDevice({
    userId: assertActor(request.actor).userId,
    token: request.body.token,
    platform: request.body.platform,
  });
}

export async function unregisterDevice(
  request: FastifyRequest<{ Params: DeviceTokenParams }>,
): Promise<{ ok: true }> {
  await service.unregisterDevice(assertActor(request.actor).userId, request.params.token);
  return { ok: true };
}
