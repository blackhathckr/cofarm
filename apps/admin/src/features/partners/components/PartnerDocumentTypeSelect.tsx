import { documentTypeSchema, type DocumentType } from '@cofarm/contracts/documents';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DOCUMENT_TYPE_LABELS, PARTNER_UPLOAD_TYPES } from '../document-types.ts';

type PartnerDocumentTypeSelectProps = {
  id: string;
  value: DocumentType;
  onChange: (type: DocumentType) => void;
};

export function PartnerDocumentTypeSelect({ id, value, onChange }: PartnerDocumentTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Document type</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          const picked = documentTypeSchema.safeParse(next);
          if (picked.success) onChange(picked.data);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PARTNER_UPLOAD_TYPES.map((option) => (
            <SelectItem key={option} value={option}>
              {DOCUMENT_TYPE_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
