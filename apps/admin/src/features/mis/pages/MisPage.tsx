import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateReportDialog } from '../components/CreateReportDialog';
import { useMisReports } from '../hooks/use-mis.ts';

type MisPageProps = {
  projectId: string;
};

function publishedLabel(publishedAt: string | null): string {
  return publishedAt === null ? '—' : publishedAt.slice(0, 10);
}

function reportPath(projectId: string, reportId: string): string {
  return `/projects/${projectId}/mis/${reportId}`;
}

export function MisPage({ projectId }: MisPageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const reports = useMisReports(projectId);
  const rows = reports.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MIS reports</h1>
          <p className="text-sm text-muted-foreground">
            One report per month, newest first. Partners see a report only once it is published.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setIsCreating(true);
          }}
        >
          <Plus />
          New report
        </Button>
      </div>

      {reports.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyState
                  colSpan={5}
                  title="No reports in the archive yet"
                  detail="Create a report for the month; partners see it once it is published."
                />
              ) : null}
              {rows.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="tabular">
                    <Link
                      to={reportPath(projectId, report.id)}
                      className="font-semibold text-clay-700 hover:underline"
                    >
                      {report.label}
                    </Link>
                  </TableCell>
                  <TableCell>{report.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.documentId === null ? 'None attached' : 'PDF attached'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.status === 'published' ? 'default' : 'outline'}>
                      {report.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {publishedLabel(report.publishedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <LoadMore paging={reports} label="Load older reports" />
        </div>
      )}

      <CreateReportDialog
        projectId={projectId}
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={() => {
          setIsCreating(false);
        }}
      />
    </div>
  );
}
