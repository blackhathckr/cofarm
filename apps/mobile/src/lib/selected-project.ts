import { useCallback, useSyncExternalStore } from 'react';

import { useSession } from '@/features/auth/hooks/use-session.ts';

/** Which project the app is showing. Every tab reads it, so it is not screen state. */
let chosenId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): string | null {
  return chosenId;
}

export function selectProject(projectId: string | null): void {
  if (chosenId === projectId) return;
  chosenId = projectId;
  for (const listener of listeners) listener();
}

type SelectedProject = {
  /** Null only while no project is mapped to the account. */
  projectId: string | null;
  select: (projectId: string) => void;
};

/** Falls back to the first membership when the stored choice is no longer held. */
export function useSelectedProject(): SelectedProject {
  const session = useSession();
  const stored = useSyncExternalStore(subscribe, snapshot, snapshot);
  const memberships = session.user?.projects ?? [];

  const isAvailable = memberships.some((membership) => membership.projectId === stored);
  const projectId = isAvailable ? stored : (memberships[0]?.projectId ?? null);

  return { projectId, select: useCallback(selectProject, []) };
}
