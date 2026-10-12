import type { Notification } from '@cofarm/contracts/notifications';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { notificationHref } from '@/lib/notification-route.ts';
import { selectProject } from '@/lib/selected-project.ts';
import { useMarkNotificationRead } from './use-notifications.ts';

/**
 * Opening a notification has to move the app to the project it is about: a
 * partner with several projects would otherwise land on the right screen
 * showing the wrong farm's data.
 */
export function useOpenNotification(): (notification: Notification) => void {
  const markRead = useMarkNotificationRead();
  const { mutate: mark } = markRead;

  return useCallback(
    (notification: Notification) => {
      if (notification.readAt === null) mark(notification.id);
      if (notification.projectId !== null) selectProject(notification.projectId);

      const target = notificationHref(notification);
      if (target !== null) router.push(target);
    },
    [mark],
  );
}
