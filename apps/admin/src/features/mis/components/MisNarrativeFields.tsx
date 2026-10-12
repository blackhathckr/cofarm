import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MisNarrativeFieldsProps = {
  narrative: string;
  outlook: string;
  onNarrativeChange: (narrative: string) => void;
  onOutlookChange: (outlook: string) => void;
};

export function MisNarrativeFields({
  narrative,
  outlook,
  onNarrativeChange,
  onOutlookChange,
}: MisNarrativeFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="mis-narrative">Narrative</Label>
        <Textarea
          id="mis-narrative"
          rows={4}
          placeholder="What the month covered. Leave blank on a generated report to have it composed."
          value={narrative}
          onChange={(event) => {
            onNarrativeChange(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mis-outlook">Outlook</Label>
        <Textarea
          id="mis-outlook"
          rows={3}
          value={outlook}
          onChange={(event) => {
            onOutlookChange(event.target.value);
          }}
        />
      </div>
    </>
  );
}
