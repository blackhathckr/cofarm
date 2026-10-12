import type { AuthUser } from '@cofarm/contracts/auth';

const REFRESH_KEY = 'cofarm.refresh';

type SessionState = {
  accessToken: string | null;
  user: AuthUser | null;
};

/**
 * The access token is held in memory only. A refresh token has to survive a
 * reload to keep the operator signed in, so that one goes to localStorage and
 * is rotated on every use.
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

export function readRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function startSession(accessToken: string, refreshToken: string, user: AuthUser): void {
  state = { accessToken, user };
  try {
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // A blocked store costs persistence across reloads, not this session.
  }
  announce();
}

export function endSession(): void {
  state = { accessToken: null, user: null };
  try {
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Nothing to clean up if the store is unavailable.
  }
  announce();
}
