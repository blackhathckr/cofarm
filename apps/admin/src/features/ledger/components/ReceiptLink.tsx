import { Button } from '@/components/ui/button';
import { useDocumentDownload } from '@/lib/document-download.ts';

type ReceiptLinkProps = {
  documentId: string;
};

export function ReceiptLink({ documentId }: ReceiptLinkProps) {
  const receipt = useDocumentDownload();

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0"
      disabled={receipt.isPending}
      onClick={() => {
        receipt.mutate(documentId);
      }}
    >
      {receipt.isPending ? 'Opening…' : 'Receipt'}
    </Button>
  );
}
