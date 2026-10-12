import type { DocumentType } from '@cofarm/contracts/documents';

import { ErrorNote } from '@/components/ErrorNote';
import { LoadMore } from '@/components/LoadMore';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectDocuments } from '@/lib/document-list.ts';
import { PartnerDocumentTable } from './PartnerDocumentTable';

type PartnerProjectDocumentsProps = {
  projectId: string;
  projectCode: string;
  projectName: string;
  type: DocumentType | null;
};

export function PartnerProjectDocuments({
  projectId,
  projectCode,
  projectName,
  type,
}: PartnerProjectDocumentsProps) {
  const filed = useProjectDocuments(projectId, type);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-baseline gap-2 border-b p-4">
        <h3 className="font-semibold text-clay-700">{projectCode}</h3>
        <p className="text-sm text-muted-foreground">{projectName}</p>
      </div>

      {filed.isPending ? (
        <Skeleton className="m-4 h-20" />
      ) : (
        <PartnerDocumentTable documents={filed.items} />
      )}

      <div className="space-y-1 px-4 pb-4">
        <ErrorNote error={filed.error} />
        <LoadMore paging={filed} label="Load older documents" />
      </div>
    </div>
  );
}
