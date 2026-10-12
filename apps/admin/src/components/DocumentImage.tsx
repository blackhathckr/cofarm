import { cn } from 'cn';

import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentUrl } from '@/lib/document-download.ts';

type DocumentImageProps = {
  documentId: string;
  alt: string;
  className?: string;
};

export function DocumentImage({ documentId, alt, className }: DocumentImageProps) {
  const ticket = useDocumentUrl(documentId);

  if (ticket.data === undefined) {
    return <Skeleton className={cn('size-full', className)} />;
  }

  return <img src={ticket.data.downloadUrl} alt={alt} className={cn('object-cover', className)} />;
}
