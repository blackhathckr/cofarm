import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';
import { Uniwind } from 'uniwind';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cofarm.theme';
/** The design is drawn in light, so that is what a fresh install shows. */
const DEFAULT_PREFERENCE: ThemePreference = 'light';

let current: ThemePreference = DEFAULT_PREFERENCE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): ThemePreference {
  return current;
}

function apply(preference: ThemePreference): void {
  current = preference;
  Uniwind.setTheme(preference);
  for (const listener of listeners) listener();
}

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Runs before the first render, so the app never flashes the phone's own theme. */
export function initThemePreference(): void {
  apply(DEFAULT_PREFERENCE);
  SecureStore.getItemAsync(STORAGE_KEY)
    .then((stored) => {
      if (isPreference(stored)) apply(stored);
    })
    .catch(() => undefined);
}

export function setThemePreference(preference: ThemePreference): void {
  apply(preference);
  SecureStore.setItemAsync(STORAGE_KEY, preference).catch(() => undefined);
}

function resolveScheme(preference: ThemePreference, system: string | null | undefined) {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** `scheme` is what is actually on screen once "system" is resolved. */
export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, snapshot, snapshot);
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);

  return { preference, scheme, setPreference: setThemePreference };
}
