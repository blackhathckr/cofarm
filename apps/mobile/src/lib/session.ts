import type { AuthUser } from '@cofarm/contracts/auth';
import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'cofarm.refresh';

type SessionState = {
  accessToken: string | null;
  user: AuthUser | null;
};

/**
 * The access token stays in memory. The refresh token goes to the device
 * keychain rather than AsyncStorage, because it is a credential.
 */
let state: SessionState = { accessToken: null, user: null };
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(): SessionState {
  return state;
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function startSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
): Promise<void> {
  state = { accessToken, user };
  announce();
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  } catch {
    // Losing persistence costs a re-login, not this session.
  }
}

export async function endSession(): Promise<void> {
  state = { accessToken: null, user: null };
  announce();
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // Nothing to clear if the keychain is unavailable.
  }
}
