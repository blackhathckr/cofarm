import type { Notification } from '@cofarm/contracts/notifications';
import type { Href } from 'expo-router';

type TabPath = '/mis' | '/project' | '/harvest' | '/chat';
type NotificationRoute = { tab: TabPath; param?: 'reportId' | 'updateId' };

/**
 * The tab that owns each notification, and the param that opens the exact
 * artefact when the notification names one. A signed document reaches a
 * partner inside the conversation, so documents and messages both land on
 * chat; a reminder points at nothing in particular and navigates nowhere.
 */
const ROUTES: Readonly<Record<Notification['type'], NotificationRoute | null>> = {
  mis_published: { tab: '/mis', param: 'reportId' },
  update_published: { tab: '/project', param: 'updateId' },
  harvest_published: { tab: '/harvest' },
  message_received: { tab: '/chat' },
  document_issued: { tab: '/chat' },
  reminder: null,
};

/**
 * Returned as a pathname plus params rather than an interpolated string: with
 * typed routes on, the router checks the destination against the real route
 * tree and a hand-built query string does not type-check.
 */
export function notificationHref(notification: Notification): Href | null {
  const route = ROUTES[notification.type];
  if (route === null) return null;
  if (route.param === undefined || notification.entityId === null) return route.tab;

  return { pathname: route.tab, params: { [route.param]: notification.entityId } };
}
