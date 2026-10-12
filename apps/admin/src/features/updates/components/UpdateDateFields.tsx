import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { indiaToday } from '@/lib/india-date.ts';

type UpdateDateFieldsProps = {
  activityDate: string;
  notifyPartners: boolean;
  dateProblem: string | null;
  onActivityDateChange: (activityDate: string) => void;
  onNotifyPartnersChange: (notifyPartners: boolean) => void;
};

export function UpdateDateFields({
  activityDate,
  notifyPartners,
  dateProblem,
  onActivityDateChange,
  onNotifyPartnersChange,
}: UpdateDateFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="update-date">Activity date</Label>
        <Input
          id="update-date"
          type="date"
          required
          max={indiaToday()}
          value={activityDate}
          onChange={(event) => {
            onActivityDateChange(event.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Back-date an update when the work happened earlier.
        </p>
        {dateProblem === null ? null : (
          <p role="alert" className="text-xs text-destructive">
            {dateProblem}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
        <Switch
          id="update-notify"
          checked={notifyPartners}
          onCheckedChange={onNotifyPartnersChange}
        />
        <div>
          <Label htmlFor="update-notify">Notify partners</Label>
          <p className="text-xs text-muted-foreground">
            Sends a push notification when this update is published.
          </p>
        </div>
      </div>
    </div>
  );
}
