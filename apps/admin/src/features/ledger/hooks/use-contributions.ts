import type { RecordContributionBody, ReverseContributionBody } from '@cofarm/contracts/ledger';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { contributionsKey, invalidateProjectMoney } from '../ledger-cache.ts';
import { fetchContributions, recordContribution, reverseContribution } from '../ledger.api.ts';

export function useContributions(projectId: string, membershipId?: string) {
  const filter = membershipId === undefined ? {} : { membershipId };

  return useCursorList({
    queryKey: [...contributionsKey(projectId), filter],
    fetchPage: (cursor) => fetchContributions(projectId, { ...filter, cursor }),
  });
}

export function useRecordContribution(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (body: RecordContributionBody) => recordContribution(projectId, body),
    onSuccess: () => invalidateProjectMoney(client, projectId),
  });
}

export function useReverseContribution(projectId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { entryId: string; body: ReverseContributionBody }) =>
      reverseContribution(projectId, input.entryId, input.body),
    onSuccess: () => invalidateProjectMoney(client, projectId),
  });
}
