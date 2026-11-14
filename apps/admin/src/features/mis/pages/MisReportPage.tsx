import { Link, useNavigate } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MisReportActions } from '../components/MisReportActions';
import { ReceiptList } from '../components/ReceiptList';
import { useMisReport } from '../hooks/use-mis.ts';

type MisReportPageProps = {
  projectId: string;
  reportId: string;
};

export function MisReportPage({ projectId, reportId }: MisReportPageProps) {
  const report = useMisReport(projectId, reportId);
  const navigate = useNavigate();

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
        </div>
        <p className="text-sm text-muted-foreground">
          {current.publishedAt === null
            ? current.title
            : `${current.title} · published ${current.publishedAt.slice(0, 10)}`}
        </p>
      </div>

      <MisReportActions
        projectId={projectId}
        report={current}
        onDeleted={() => {
          void navigate({ to: archivePath });
        }}
      />

      <ReceiptList projectId={projectId} reportId={reportId} />
    </div>
  );
}
