import { FileUp } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { acceptAttribute, SPREADSHEET_MIMES } from '@/lib/upload-limits.ts';

type MisFileFieldProps = {
  file: File | null;
  problem: string | null;
  disabled: boolean;
  emptyHint: string;
  onChange: (file: File | null) => void;
};

export function MisFileField({ file, problem, disabled, emptyHint, onChange }: MisFileFieldProps) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>MIS workbook (.xlsx)</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            picker.current?.click();
          }}
        >
          <FileUp />
          {file === null ? 'Choose file' : 'Replace file'}
        </Button>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {file === null ? emptyHint : file.name}
        </span>
      </div>

      <input
        ref={picker}
        type="file"
        hidden
        accept={acceptAttribute(SPREADSHEET_MIMES)}
        onChange={(event) => {
          const chosen = event.target.files?.[0] ?? null;
          event.target.value = '';
          onChange(chosen);
        }}
      />

      {problem === null ? null : (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
