import {
  deviceSchema,
  deviceTokenParamsSchema,
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  notificationPageSchema,
  notificationSchema,
  readAllResultSchema,
  registerDeviceBodySchema,
} from '@cofarm/contracts/notifications';
import { okSchema } from '@cofarm/contracts/primitives';

export const notificationSchemas = {
  list: {
    querystring: listNotificationsQuerySchema,
    response: { 200: notificationPageSchema },
  },
  markRead: {
    params: notificationIdParamsSchema,
    response: { 200: notificationSchema },
  },
  markAllRead: {
    response: { 200: readAllResultSchema },
  },
  registerDevice: {
    body: registerDeviceBodySchema,
    response: { 200: deviceSchema },
  },
  unregisterDevice: {
    params: deviceTokenParamsSchema,
    response: { 200: okSchema },
  },
} as const;
