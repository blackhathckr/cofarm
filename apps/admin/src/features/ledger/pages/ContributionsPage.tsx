import type { LedgerEntry } from '@cofarm/contracts/ledger';
import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { LoadMore } from '@/components/LoadMore';
import { StatTile } from '@/components/StatTile';
import { MoneyText } from '@/components/MoneyText';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectPartners } from '@/lib/project-partners.ts';
import { ContributionTable } from '../components/ContributionTable';
import { ContributionTotals } from '../components/ContributionTotals';
import { RecordContributionDialog } from '../components/RecordContributionDialog';
import { ReverseContributionDialog } from '../components/ReverseContributionDialog';
import { ANY_VALUE } from '../expense-filters.ts';
import { useContributions } from '../hooks/use-contributions.ts';

type ContributionsPageProps = {
  projectId: string;
};

export function ContributionsPage({ projectId }: ContributionsPageProps) {
  const [membershipId, setMembershipId] = useState(ANY_VALUE);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);

  const partners = useProjectPartners(projectId);
  const contributions = useContributions(
    projectId,
    membershipId === ANY_VALUE ? undefined : membershipId,
  );

  const firstPage = contributions.firstPage;
  const entries = contributions.items;
  const roster = partners.data ?? [];

  function partnerNameOf(entry: LedgerEntry): string {
    const match = roster.find((partner) => partner.membershipId === entry.membershipId);
    return match?.name ?? 'Unknown partner';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contributions</h1>
          <p className="text-sm text-muted-foreground">
            Money received from partners against their memberships on this project.
          </p>
        </div>
        <RecordContributionDialog projectId={projectId} partners={roster} />
      </div>

      {firstPage === undefined ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Total received"
            value={<MoneyText paise={firstPage.totalPaise} showPaise />}
            hint="reversed entries excluded"
            tone="sage"
          />
          <StatTile label="Partners on the roster" value={roster.length} />
        </div>
      )}

      {firstPage === undefined ? null : (
        <div className="rounded-lg border bg-card">
          <ContributionTotals
            totals={firstPage.totalsByMembership}
            partners={roster}
            totalPaise={firstPage.totalPaise}
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="contribution-filter">Partner</Label>
          <Select value={membershipId} onValueChange={setMembershipId}>
            <SelectTrigger id="contribution-filter" className="w-64">
              <SelectValue placeholder="All partners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>All partners</SelectItem>
              {roster.map((partner) => (
                <SelectItem key={partner.membershipId} value={partner.membershipId}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ErrorNote error={contributions.error} />

      {contributions.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <ContributionTable entries={entries} partners={roster} onReverse={setReversing} />
          <LoadMore paging={contributions} label="Load older entries" />
        </div>
      )}

      {reversing === null ? null : (
        <ReverseContributionDialog
          projectId={projectId}
          entry={reversing}
          partnerName={partnerNameOf(reversing)}
          onClose={() => {
            setReversing(null);
          }}
        />
      )}
    </div>
  );
}
