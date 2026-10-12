import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDocumentDownload } from '@/lib/document-download.ts';

type DownloadDocumentButtonProps = {
  documentId: string;
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
};

export function DownloadDocumentButton({
  documentId,
  label,
  variant = 'outline',
  className,
}: DownloadDocumentButtonProps) {
  const download = useDocumentDownload();

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={variant}
        disabled={download.isPending}
        className={className}
        onClick={() => {
          download.mutate(documentId);
        }}
      >
        <Download />
        {download.isPending ? 'Preparing…' : label}
      </Button>
      {download.error === null ? null : (
        <p role="alert" className="text-xs text-destructive">
          {download.error.message}
        </p>
      )}
    </div>
  );
}
