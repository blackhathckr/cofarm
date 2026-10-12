import {
  contributionPageSchema,
  expensePageSchema,
  ledgerEntrySchema,
  ledgerSummarySchema,
  type ListContributionsQuery,
  type ListExpensesQuery,
  type RecordContributionBody,
  type RecordExpenseBody,
  type RecordRevenueBody,
  type ReverseContributionBody,
  type ReverseExpenseBody,
} from '@cofarm/contracts/ledger';

import { request } from '@/lib/api-client.ts';

export function fetchExpenses(projectId: string, query: Partial<ListExpensesQuery>) {
  const params = new URLSearchParams();
  if (query.cycleId !== undefined) params.set('cycleId', query.cycleId);
  if (query.costHead !== undefined) params.set('costHead', query.costHead);
  if (query.from !== undefined) params.set('from', query.from);
  if (query.to !== undefined) params.set('to', query.to);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 50));

  return request(`/v1/projects/${projectId}/expenses?${params.toString()}`, expensePageSchema);
}

export function recordExpense(projectId: string, body: RecordExpenseBody) {
  return request(`/v1/projects/${projectId}/expenses`, ledgerEntrySchema, {
    method: 'POST',
    body,
  });
}

export function reverseExpense(projectId: string, entryId: string, body: ReverseExpenseBody) {
  return request(`/v1/projects/${projectId}/expenses/${entryId}/reverse`, ledgerEntrySchema, {
    method: 'POST',
    body,
  });
}

export function fetchContributions(projectId: string, query: Partial<ListContributionsQuery>) {
  const params = new URLSearchParams();
  if (query.membershipId !== undefined) params.set('membershipId', query.membershipId);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 50));

  return request(
    `/v1/projects/${projectId}/contributions?${params.toString()}`,
    contributionPageSchema,
  );
}

export function recordContribution(projectId: string, body: RecordContributionBody) {
  return request(`/v1/projects/${projectId}/contributions`, ledgerEntrySchema, {
    method: 'POST',
    body,
  });
}

export function reverseContribution(
  projectId: string,
  entryId: string,
  body: ReverseContributionBody,
) {
  return request(`/v1/projects/${projectId}/contributions/${entryId}/reverse`, ledgerEntrySchema, {
    method: 'POST',
    body,
  });
}

export function recordRevenue(projectId: string, body: RecordRevenueBody) {
  return request(`/v1/projects/${projectId}/revenue`, ledgerEntrySchema, {
    method: 'POST',
    body,
  });
}

export function fetchLedgerSummary(projectId: string, cycleId?: string) {
  const params = new URLSearchParams();
  if (cycleId !== undefined) params.set('cycleId', cycleId);

  return request(
    `/v1/projects/${projectId}/ledger/summary?${params.toString()}`,
    ledgerSummarySchema,
  );
}
