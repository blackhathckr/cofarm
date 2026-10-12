import type { DocumentType } from '@cofarm/contracts/documents';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorNote } from '@/components/ErrorNote';
import { useDocumentUpload } from '@/lib/document-upload.ts';

type DocumentPickerProps = {
  label: string;
  projectId: string;
  type: DocumentType;
  documentId: string | null;
  onUploaded: (documentId: string | null) => void;
};

export function DocumentPicker({
  label,
  projectId,
  type,
  documentId,
  onUploaded,
}: DocumentPickerProps) {
  const field = useRef<HTMLInputElement>(null);
  const upload = useDocumentUpload();

  if (documentId !== null) {
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">Attached</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onUploaded(null);
              upload.reset();
              if (field.current !== null) field.current.value = '';
            }}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`upload-${type}`}>{label}</Label>
      <Input
        id={`upload-${type}`}
        ref={field}
        type="file"
        disabled={upload.isPending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file === undefined) return;
          upload.mutate(
            { file, projectId, type },
            {
              onSuccess: (stored) => {
                onUploaded(stored.id);
              },
            },
          );
        }}
      />
      {upload.isPending ? (
        <p className="text-xs text-muted-foreground">Uploading…</p>
      ) : (
        <ErrorNote error={upload.error} />
      )}
    </div>
  );
}
