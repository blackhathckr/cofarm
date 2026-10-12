import type { DocumentType } from '@cofarm/contracts/documents';
import type { PartnerMembership } from '@cofarm/contracts/partners';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { DocumentTypeFilter } from './DocumentTypeFilter';
import { PartnerProjectDocuments } from './PartnerProjectDocuments';
import { UploadPartnerDocumentDialog } from './UploadPartnerDocumentDialog';

type PartnerDocumentsSectionProps = {
  memberships: PartnerMembership[];
};

export function PartnerDocumentsSection({ memberships }: PartnerDocumentsSectionProps) {
  const [type, setType] = useState<DocumentType | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Grouped by project, newest first. A document is reachable only through the project it
            was filed against.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <DocumentTypeFilter value={type} onChange={setType} />
          <UploadPartnerDocumentDialog memberships={memberships} />
        </div>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          title="No projects to file against"
          detail="Map this partner to a project before filing documents against them."
        />
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => (
            <PartnerProjectDocuments
              key={membership.projectId}
              projectId={membership.projectId}
              projectCode={membership.projectCode}
              projectName={membership.projectName}
              type={type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
