import type { MisComposePayload } from '@cofarm/contracts/mis';
import { Link } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDocumentDownload } from '@/lib/document-download.ts';
import { Skeleton } from '@/components/ui/skeleton';
import { ComposedFigures } from '../components/ComposedFigures';
import { MisReportActions } from '../components/MisReportActions';
import { ReceiptList } from '../components/ReceiptList';
import { useMisReport } from '../hooks/use-mis.ts';

type MisReportPageProps = {
  projectId: string;
  reportId: string;
};

export function MisReportPage({ projectId, reportId }: MisReportPageProps) {
  const report = useMisReport(projectId, reportId);
  const openDocument = useDocumentDownload();
  const [composed, setComposed] = useState<MisComposePayload | null>(null);

  if (report.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (report.data === undefined) {
    return <p className="text-sm text-muted-foreground">That report could not be loaded.</p>;
  }

  const current = report.data;
  const isPublished = current.status === 'published';
  const archivePath = `/projects/${projectId}/mis`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to={archivePath}
          className="text-xs font-semibold tracking-[0.14em] text-clay-600 uppercase hover:underline"
        >
          MIS archive
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{current.label}</h1>
          <Badge variant={isPublished ? 'default' : 'outline'}>
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
          <Badge variant="secondary">{current.source}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {current.publishedAt === null
            ? current.title
            : `${current.title} · published ${current.publishedAt.slice(0, 10)}`}
        </p>

        {current.documentId === null ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={openDocument.isPending}
            onClick={() => {
              if (current.documentId !== null) openDocument.mutate(current.documentId);
            }}
          >
            <FileText />
            {openDocument.isPending ? 'Opening…' : 'View report PDF'}
          </Button>
        )}
      </div>

      <MisReportActions
        projectId={projectId}
        report={current}
        onComposed={setComposed}
        onDeleted={() => {
          setComposed(null);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Narrative</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
            {current.narrative ?? 'Not written yet.'}
          </p>
        </section>
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Outlook</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
            {current.outlook ?? 'Not written yet.'}
          </p>
        </section>
      </div>

      {composed === null ? null : <ComposedFigures payload={composed} />}

      <ReceiptList projectId={projectId} reportId={reportId} />
    </div>
  );
}
