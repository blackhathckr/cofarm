import type { MembershipTotal } from '@cofarm/contracts/ledger';
import type { ProjectPartner } from '@cofarm/contracts/partners';

import { MoneyText } from '@/components/MoneyText';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ContributionTotalsProps = {
  totals: readonly MembershipTotal[];
  partners: readonly ProjectPartner[];
  totalPaise: string;
};

type TotalRow = {
  membershipId: string;
  name: string;
  committedPaise: string;
  receivedPaise: string;
};

function toRows(
  totals: readonly MembershipTotal[],
  partners: readonly ProjectPartner[],
): TotalRow[] {
  const received = new Map(totals.map((total) => [total.membershipId, total.totalPaise]));
  const known = partners.map((partner) => ({
    membershipId: partner.membershipId,
    name: partner.name,
    committedPaise: partner.contributionPaise,
    receivedPaise: received.get(partner.membershipId) ?? '0',
  }));

  const rostered = new Set(partners.map((partner) => partner.membershipId));
  const orphaned = totals
    .filter((total) => !rostered.has(total.membershipId))
    .map((total) => ({
      membershipId: total.membershipId,
      name: 'Membership no longer on the roster',
      committedPaise: '0',
      receivedPaise: total.totalPaise,
    }));

  return [...known, ...orphaned];
}

export function ContributionTotals({ totals, partners, totalPaise }: ContributionTotalsProps) {
  const rows = toRows(totals, partners);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Partner</TableHead>
          <TableHead className="text-right">Committed</TableHead>
          <TableHead className="text-right">Received</TableHead>
          <TableHead>Standing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const outstanding = BigInt(row.committedPaise) - BigInt(row.receivedPaise);

          return (
            <TableRow key={row.membershipId}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right">
                <MoneyText paise={row.committedPaise} showPaise />
              </TableCell>
              <TableCell className="text-right">
                <MoneyText paise={row.receivedPaise} showPaise />
              </TableCell>
              <TableCell>
                {outstanding > 0n ? (
                  <Badge variant="secondary">
                    <MoneyText paise={outstanding.toString()} showPaise /> outstanding
                  </Badge>
                ) : (
                  <Badge variant="outline">Settled</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total received</TableCell>
          <TableCell />
          <TableCell className="text-right font-semibold">
            <MoneyText paise={totalPaise} showPaise />
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
