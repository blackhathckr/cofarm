import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EditPartnerDialog } from '../components/EditPartnerDialog';
import { MapMembershipDialog } from '../components/MapMembershipDialog';
import { MembershipsTable } from '../components/MembershipsTable';
import { PartnerDocumentsSection } from '../components/PartnerDocumentsSection';
import { PartnerMessagesSection } from '../components/PartnerMessagesSection';
import { usePartner } from '../hooks/use-partners.ts';
import { PARTNER_BADGE_LABELS, PARTNER_BADGE_VARIANTS } from '../partner-labels.ts';

type PartnerDetailPageProps = {
  partnerId: string;
};

export function PartnerDetailPage({ partnerId }: PartnerDetailPageProps) {
  const partner = usePartner(partnerId);

  if (partner.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (partner.data === undefined) {
    return <p className="text-sm text-muted-foreground">That partner could not be loaded.</p>;
  }

  const person = partner.data;
  const activeMemberships = person.memberships.filter(
    (membership) => membership.status === 'active',
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar size="lg">
            <AvatarFallback>{person.initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
              <Badge variant={PARTNER_BADGE_VARIANTS[person.badge]}>
                {PARTNER_BADGE_LABELS[person.badge]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {[person.mobile ?? 'no mobile', person.email ?? 'no email', person.status].join(
                ' · ',
              )}
            </p>
          </div>
        </div>
        <EditPartnerDialog partner={person} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Total contribution"
          value={<MoneyText paise={person.totalContributionPaise} />}
          tone="sage"
        />
        <StatTile
          label="Active memberships"
          value={activeMemberships.length}
          hint={`of ${person.memberships.length} mapped`}
        />
        <StatTile
          label="Projects"
          value={person.projectCodes.length === 0 ? '—' : person.projectCodes.join(', ')}
          tone="clay"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Memberships</h2>
          <MapMembershipDialog
            partnerId={person.id}
            mappedProjectIds={person.memberships.map((membership) => membership.projectId)}
          />
        </div>
        <MembershipsTable partnerId={person.id} memberships={person.memberships} />
      </div>

      <PartnerDocumentsSection memberships={person.memberships} />

      <PartnerMessagesSection partnerId={person.id} memberships={person.memberships} />
    </div>
  );
}
