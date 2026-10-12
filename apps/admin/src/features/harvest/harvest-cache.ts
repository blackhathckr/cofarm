import type { QueryClient } from '@tanstack/react-query';

export function harvestsKey(projectId: string): readonly unknown[] {
  return ['projects', projectId, 'harvests'];
}

export function harvestPreviewKey(projectId: string, harvestId: string): readonly unknown[] {
  return ['projects', projectId, 'harvests', harvestId, 'preview'];
}

/** Publishing appends revenue and payouts append ledger entries, so the
 * expense and contribution screens are stale after either. */
export async function invalidateHarvestMoney(
  client: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: harvestsKey(projectId) }),
    client.invalidateQueries({ queryKey: ['projects', projectId, 'expenses'] }),
    client.invalidateQueries({ queryKey: ['projects', projectId, 'contributions'] }),
    client.invalidateQueries({ queryKey: ['projects', projectId, 'ledger-summary'] }),
  ]);
}
