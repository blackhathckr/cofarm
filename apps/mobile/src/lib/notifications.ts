import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'default';

/** A foregrounded app shows nothing unless a handler says to. */
export function armForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
  });

  if (Platform.OS !== 'android') return;

  // Android drops a notification naming no channel, so declare it up front.
  void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Project updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  }).catch(() => {
    // An unconfigured build still runs; it just receives no push.
  });
}
