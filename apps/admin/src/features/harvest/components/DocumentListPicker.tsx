import type { DocumentType } from '@cofarm/contracts/documents';
import { useRef } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDocumentUploads } from '../hooks/use-document-uploads.ts';

type DocumentListPickerProps = {
  label: string;
  projectId: string;
  type: DocumentType;
  documentIds: readonly string[];
  disabled: boolean;
  onChange: (documentIds: string[]) => void;
};

export function DocumentListPicker({
  label,
  projectId,
  type,
  documentIds,
  disabled,
  onChange,
}: DocumentListPickerProps) {
  const field = useRef<HTMLInputElement>(null);
  const uploads = useDocumentUploads();

  function clearField(): void {
    if (field.current !== null) field.current.value = '';
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`upload-${type}`}>{label}</Label>
      <Input
        id={`upload-${type}`}
        ref={field}
        type="file"
        multiple
        disabled={disabled || uploads.isPending}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length === 0) return;
          uploads.mutate(
            { files, projectId, type },
            {
              onSuccess: (uploaded) => {
                onChange([...documentIds, ...uploaded]);
                clearField();
              },
            },
          );
        }}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{uploads.isPending ? 'Uploading…' : `${documentIds.length} attached`}</span>
        {documentIds.length === 0 || disabled ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange([]);
              uploads.reset();
              clearField();
            }}
          >
            Remove all
          </Button>
        )}
      </div>
      <ErrorNote error={uploads.error} />
    </div>
  );
}
