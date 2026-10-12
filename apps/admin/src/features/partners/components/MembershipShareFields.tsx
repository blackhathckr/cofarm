import type { PartnerMembership } from '@cofarm/contracts/partners';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ShareBasis = PartnerMembership['shareBasis'];

type MembershipShareFieldsProps = {
  idPrefix: string;
  rupees: string;
  onRupeesChange: (value: string) => void;
  shareBasis: ShareBasis;
  onShareBasisChange: (value: ShareBasis) => void;
  sharePct: string;
  onSharePctChange: (value: string) => void;
};

export function MembershipShareFields({
  idPrefix,
  rupees,
  onRupeesChange,
  shareBasis,
  onShareBasisChange,
  sharePct,
  onSharePctChange,
}: MembershipShareFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-contribution`}>Contribution (rupees)</Label>
        <Input
          id={`${idPrefix}-contribution`}
          inputMode="decimal"
          placeholder="500000"
          value={rupees}
          onChange={(event) => {
            onRupeesChange(event.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Share basis</Label>
        <RadioGroup
          value={shareBasis}
          onValueChange={(value) => {
            onShareBasisChange(value === 'fixed_pct' ? 'fixed_pct' : 'pro_rata_contribution');
          }}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="pro_rata_contribution" id={`${idPrefix}-pro-rata`} />
            <Label htmlFor={`${idPrefix}-pro-rata`} className="font-normal">
              Pro rata on contribution
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fixed_pct" id={`${idPrefix}-fixed`} />
            <Label htmlFor={`${idPrefix}-fixed`} className="font-normal">
              Fixed percentage
            </Label>
          </div>
        </RadioGroup>
      </div>

      {shareBasis === 'fixed_pct' ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-pct`}>Share percentage</Label>
          <Input
            id={`${idPrefix}-pct`}
            inputMode="decimal"
            placeholder="12.5"
            value={sharePct}
            onChange={(event) => {
              onSharePctChange(event.target.value);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
