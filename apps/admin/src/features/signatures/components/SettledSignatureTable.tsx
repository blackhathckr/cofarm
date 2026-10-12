import type { SignatureRequest } from '@cofarm/contracts/signatures';

import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/date-format.ts';

type SettledSignatureTableProps = {
  requests: readonly SignatureRequest[];
  onView: (documentId: string) => void;
};

const STATUS_TONE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  signed: 'default',
  cancelled: 'outline',
  declined: 'destructive',
};

export function SettledSignatureTable({ requests, onView }: SettledSignatureTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Partner</TableHead>
          <TableHead>Document</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Signed by</TableHead>
          <TableHead>Signed at</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Document</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <EmptyState
            colSpan={7}
            title="No settled requests yet"
            detail="Signed, declined and cancelled requests are listed here."
          />
        ) : null}
        {requests.map((signature) => (
          <TableRow key={signature.id}>
            <TableCell className="font-medium">{signature.partnerName}</TableCell>
            <TableCell>{signature.documentName}</TableCell>
            <TableCell className="font-semibold text-clay-700">{signature.projectCode}</TableCell>
            <TableCell>{signature.signedName ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">
              {signature.signedAt === null ? '—' : formatDateTime(signature.signedAt)}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_TONE[signature.status] ?? 'outline'}>{signature.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onView(signature.documentId);
                }}
              >
                Download
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
