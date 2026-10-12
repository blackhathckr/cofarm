import type { DevicePlatform } from '@cofarm/contracts/notifications';
import * as Notifications from 'expo-notifications';

/**
 * The push token this install registered, held in memory so sign-out can
 * withdraw it. A token the device never handed us is not ours to delete, so an
 * unregistered install signs out without touching the devices endpoint.
 */
let registeredToken: string | null = null;

export type PushDevice = {
  token: string;
  platform: DevicePlatform;
};

export function rememberDeviceToken(token: string): void {
  registeredToken = token;
}

export function registeredDeviceToken(): string | null {
  return registeredToken;
}

export function forgetDeviceToken(): void {
  registeredToken = null;
}

/**
 * The server sends through FCM/APNs directly, so the native token is what it
 * wants. A build without push credentials cannot produce one and never registers.
 */
export async function requestDeviceToken(): Promise<PushDevice | null> {
  try {
    const granted = await Notifications.getPermissionsAsync();
    const permission = granted.granted ? granted : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;

    const push = await Notifications.getDevicePushTokenAsync();
    if (push.type !== 'ios' && push.type !== 'android') return null;
    if (typeof push.data !== 'string') return null;

    return { token: push.data, platform: push.type };
  } catch {
    return null;
  }
}
