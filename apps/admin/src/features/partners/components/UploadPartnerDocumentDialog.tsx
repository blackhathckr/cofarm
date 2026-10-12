import type { DocumentType } from '@cofarm/contracts/documents';
import type { PartnerMembership } from '@cofarm/contracts/partners';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { ErrorNote } from '@/components/ErrorNote';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptAttribute, DOCUMENT_MIMES } from '@/lib/upload-limits.ts';
import { useUploadPartnerDocument } from '../hooks/use-upload-partner-document.ts';
import { MembershipProjectSelect } from './MembershipProjectSelect';
import { PartnerDocumentTypeSelect } from './PartnerDocumentTypeSelect';

type UploadPartnerDocumentDialogProps = {
  memberships: PartnerMembership[];
};

export function UploadPartnerDocumentDialog({ memberships }: UploadPartnerDocumentDialogProps) {
  const upload = useUploadPartnerDocument();
  const field = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState(memberships[0]?.projectId ?? '');
  const [type, setType] = useState<DocumentType>('agreement');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) upload.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={memberships.length === 0}>
          <Upload />
          Upload document
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            A document is filed against one of this partner&apos;s projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <MembershipProjectSelect
            id="partner-document-project"
            memberships={memberships}
            value={projectId}
            onChange={setProjectId}
          />
          <PartnerDocumentTypeSelect id="partner-document-type" value={type} onChange={setType} />

          <div className="space-y-2">
            <Label htmlFor="partner-document-file">File</Label>
            <Input
              id="partner-document-file"
              ref={field}
              type="file"
              accept={acceptAttribute(DOCUMENT_MIMES)}
              disabled={upload.isPending}
            />
          </div>

          <ErrorNote error={upload.error} />
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={upload.isPending || projectId === ''}
            onClick={() => {
              const file = field.current?.files?.[0];
              if (file === undefined) return;
              upload.mutate(
                { file, projectId, type },
                {
                  onSuccess: (stored) => {
                    toast.success(`${stored.originalName} uploaded`);
                    setIsOpen(false);
                    if (field.current !== null) field.current.value = '';
                  },
                },
              );
            }}
          >
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
