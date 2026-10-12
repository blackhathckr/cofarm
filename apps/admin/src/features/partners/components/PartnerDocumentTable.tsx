import type { Document } from '@cofarm/contracts/documents';

import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';
import { DownloadDocumentButton } from '@/components/DownloadDocumentButton';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/date-format.ts';
import { DOCUMENT_TYPE_LABELS } from '../document-types.ts';

type PartnerDocumentTableProps = {
  documents: readonly Document[];
};

export function PartnerDocumentTable({ documents }: PartnerDocumentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length === 0 ? (
          <EmptyState
            colSpan={4}
            title="No documents filed here yet"
            detail="Upload an agreement, a statement or a slip against this project."
          />
        ) : null}
        {documents.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.originalName}</TableCell>
            <TableCell>
              <Badge variant="outline">{DOCUMENT_TYPE_LABELS[row.type]}</Badge>
            </TableCell>
            <TableCell className="tabular text-muted-foreground">
              {formatDate(row.createdAt)}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <DownloadDocumentButton documentId={row.id} label="View" />
                <DeleteDocumentButton documentId={row.id} name={row.originalName} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
