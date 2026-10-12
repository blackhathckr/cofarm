import type { PartnerMembership } from '@cofarm/contracts/partners';
import { Link } from '@tanstack/react-router';

import { EmptyState } from '@/components/EmptyState';
import { MoneyText } from '@/components/MoneyText';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditMembershipDialog } from './EditMembershipDialog';
import { ExitMembershipDialog } from './ExitMembershipDialog';

type AgreementStatus = PartnerMembership['agreementStatus'];

type MembershipsTableProps = {
  partnerId: string;
  memberships: PartnerMembership[];
};

const AGREEMENT_TONE: Record<AgreementStatus, 'default' | 'secondary' | 'outline'> = {
  signed: 'default',
  sent: 'secondary',
  not_sent: 'outline',
};

const AGREEMENT_LABELS: Record<AgreementStatus, string> = {
  signed: 'Signed',
  sent: 'Sent',
  not_sent: 'Not sent',
};

export function MembershipsTable({ partnerId, memberships }: MembershipsTableProps) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        title="This partner is not mapped to a project yet"
        detail="A partner reaches a project only through an active membership."
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Contribution</TableHead>
            <TableHead>Share basis</TableHead>
            <TableHead>Agreement</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Exited</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((membership) => (
            <TableRow key={membership.id}>
              <TableCell>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: membership.projectId }}
                  className="font-semibold text-clay-700 hover:underline"
                >
                  {membership.projectCode}
                </Link>
                <p className="text-xs text-muted-foreground">{membership.projectName}</p>
              </TableCell>
              <TableCell className="text-right">
                <MoneyText paise={membership.contributionPaise} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {membership.shareBasis === 'fixed_pct'
                  ? `Fixed ${(membership.sharePctBps ?? 0) / 100}%`
                  : 'Pro rata'}
              </TableCell>
              <TableCell>
                <Badge variant={AGREEMENT_TONE[membership.agreementStatus]}>
                  {AGREEMENT_LABELS[membership.agreementStatus]}
                </Badge>
              </TableCell>
              <TableCell className="tabular text-muted-foreground">{membership.joinedAt}</TableCell>
              <TableCell className="tabular text-muted-foreground">
                {membership.exitedAt ?? '—'}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <EditMembershipDialog partnerId={partnerId} membership={membership} />
                  {membership.status === 'active' ? (
                    <ExitMembershipDialog partnerId={partnerId} membership={membership} />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
