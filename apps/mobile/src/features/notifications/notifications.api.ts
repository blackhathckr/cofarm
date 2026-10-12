import { notificationPageSchema, notificationSchema } from '@cofarm/contracts/notifications';

import { request } from '@/lib/api-client.ts';

const PAGE_SIZE = 20;

export function fetchNotifications(cursor: string | null, date: string | null) {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor !== null) query.set('cursor', cursor);
  if (date !== null) query.set('date', date);

  return request(`/v1/notifications?${query.toString()}`, notificationPageSchema);
}

export function markNotificationRead(notificationId: string) {
  return request(`/v1/notifications/${notificationId}/read`, notificationSchema, {
    method: 'POST',
  });
}
