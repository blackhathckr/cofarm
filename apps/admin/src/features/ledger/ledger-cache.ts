import type { QueryClient } from '@tanstack/react-query';

export function expensesKey(projectId: string): readonly unknown[] {
  return ['projects', projectId, 'expenses'];
}

export function contributionsKey(projectId: string): readonly unknown[] {
  return ['projects', projectId, 'contributions'];
}

export function ledgerSummaryKey(projectId: string): readonly unknown[] {
  return ['projects', projectId, 'ledger-summary'];
}

/** Any ledger movement changes total cost, so every harvest preview that reads
 * it is stale too. */
export async function invalidateProjectMoney(
  client: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: expensesKey(projectId) }),
    client.invalidateQueries({ queryKey: contributionsKey(projectId) }),
    client.invalidateQueries({ queryKey: ledgerSummaryKey(projectId) }),
    client.invalidateQueries({ queryKey: ['projects', projectId, 'harvests'] }),
  ]);
}
