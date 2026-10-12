import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type NoteFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function NoteField({ id, label, value, onChange }: NoteFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={2}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
