import { cn } from 'cn';
import { Play } from 'lucide-react';

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

  if (ticket.data.mime.startsWith('video/')) {
    return (
      <span className={cn('relative block bg-black', className)}>
        <video
          src={ticket.data.downloadUrl}
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          className="size-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <Play className="size-6 fill-white text-white drop-shadow" />
        </span>
      </span>
    );
  }

  return <img src={ticket.data.downloadUrl} alt={alt} className={cn('object-cover', className)} />;
}
