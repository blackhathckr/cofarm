import type { SignatureRequest } from '@cofarm/contracts/signatures';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/date-format.ts';
import { daysWaiting } from '../signature-dates.ts';

type PendingSignatureTableProps = {
  requests: readonly SignatureRequest[];
  busyRequestId: string | null;
  onView: (documentId: string) => void;
  onRemind: (requestId: string) => void;
  onCancel: (requestId: string) => void;
};

export function PendingSignatureTable({
  requests,
  busyRequestId,
  onView,
  onRemind,
  onCancel,
}: PendingSignatureTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Partner</TableHead>
          <TableHead>Document</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead className="text-right">Waiting</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <EmptyState
            colSpan={6}
            title="Nothing is waiting on a signature"
            detail="Issue a document to a partner and it appears here until they acknowledge it."
          />
        ) : null}
        {requests.map((signature) => (
          <TableRow key={signature.id}>
            <TableCell className="font-medium">{signature.partnerName}</TableCell>
            <TableCell>{signature.documentName}</TableCell>
            <TableCell className="font-semibold text-clay-700">{signature.projectCode}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(signature.sentAt)}</TableCell>
            <TableCell className="tabular text-right">
              {`${daysWaiting(signature.sentAt)} d`}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyRequestId === signature.id}
                  onClick={() => {
                    onRemind(signature.id);
                  }}
                >
                  Send reminder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onView(signature.documentId);
                  }}
                >
                  View document
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={busyRequestId === signature.id}
                  onClick={() => {
                    onCancel(signature.id);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
