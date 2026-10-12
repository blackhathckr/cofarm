import { TableCell, TableRow } from '@/components/ui/table';

type EmptyStateProps = {
  title: string;
  detail?: string;
  colSpan?: number;
};

export function EmptyState({ title, detail, colSpan }: EmptyStateProps) {
  const body = (
    <div className="space-y-1 py-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {detail === undefined ? null : <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );

  if (colSpan === undefined) {
    return <div className="rounded-lg border border-dashed bg-card px-6">{body}</div>;
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan}>{body}</TableCell>
    </TableRow>
  );
}
