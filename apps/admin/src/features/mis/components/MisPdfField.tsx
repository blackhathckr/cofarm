import { FileUp } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { acceptAttribute, PDF_MIME } from '@/lib/upload-limits.ts';

type MisPdfFieldProps = {
  file: File | null;
  problem: string | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
};

export function MisPdfField({ file, problem, disabled, onChange }: MisPdfFieldProps) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Report PDF</Label>
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
          {file === null ? 'Choose PDF' : 'Replace PDF'}
        </Button>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {file === null ? 'An uploaded report needs its PDF now.' : file.name}
        </span>
      </div>

      <input
        ref={picker}
        type="file"
        hidden
        accept={acceptAttribute([PDF_MIME])}
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
