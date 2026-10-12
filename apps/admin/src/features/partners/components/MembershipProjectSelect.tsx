import type { PartnerMembership } from '@cofarm/contracts/partners';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MembershipProjectSelectProps = {
  id: string;
  memberships: PartnerMembership[];
  value: string;
  onChange: (projectId: string) => void;
};

export function MembershipProjectSelect({
  id,
  memberships,
  value,
  onChange,
}: MembershipProjectSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Project</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a project" />
        </SelectTrigger>
        <SelectContent>
          {memberships.map((membership) => (
            <SelectItem key={membership.projectId} value={membership.projectId}>
              {`${membership.projectCode} · ${membership.projectName}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
