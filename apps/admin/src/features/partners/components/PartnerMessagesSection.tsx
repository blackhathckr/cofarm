import type { PartnerMembership } from '@cofarm/contracts/partners';

import { EmptyState } from '@/components/EmptyState';
import { PartnerProjectThread } from './PartnerProjectThread';

type PartnerMessagesSectionProps = {
  partnerId: string;
  memberships: PartnerMembership[];
};

export function PartnerMessagesSection({ partnerId, memberships }: PartnerMessagesSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="text-sm text-muted-foreground">
          One thread per project, read-only here. Replying and resolving happen in the inbox.
        </p>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          title="No threads yet"
          detail="A thread belongs to a project, so this partner has none until they are mapped to one."
        />
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => (
            <PartnerProjectThread
              key={membership.projectId}
              partnerId={partnerId}
              projectId={membership.projectId}
              projectCode={membership.projectCode}
              projectName={membership.projectName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
