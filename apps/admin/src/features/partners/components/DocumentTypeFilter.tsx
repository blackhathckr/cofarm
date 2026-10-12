import { documentTypeSchema, type DocumentType } from '@cofarm/contracts/documents';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DOCUMENT_TYPE_LABELS } from '../document-types.ts';

const ALL_TYPES = 'all-types';

type DocumentTypeFilterProps = {
  value: DocumentType | null;
  onChange: (type: DocumentType | null) => void;
};

export function DocumentTypeFilter({ value, onChange }: DocumentTypeFilterProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Type</Label>
      <Select
        value={value ?? ALL_TYPES}
        onValueChange={(next) => {
          const picked = documentTypeSchema.safeParse(next);
          onChange(picked.success ? picked.data : null);
        }}
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES}>All types</SelectItem>
          {documentTypeSchema.options.map((option) => (
            <SelectItem key={option} value={option}>
              {DOCUMENT_TYPE_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
