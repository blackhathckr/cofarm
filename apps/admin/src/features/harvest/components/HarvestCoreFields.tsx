import type { Cycle } from '@cofarm/contracts/projects';
import { Link } from '@tanstack/react-router';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { indiaToday } from '@/lib/india-date.ts';
import type { HarvestDraft } from '../harvest-draft.ts';

type HarvestCoreFieldsProps = {
  projectId: string;
  draft: HarvestDraft;
  cycles: readonly Cycle[];
  disabled: boolean;
  cycleLocked: boolean;
  onPatch: (next: Partial<HarvestDraft>) => void;
};

export function HarvestCoreFields({
  projectId,
  draft,
  cycles,
  disabled,
  cycleLocked,
  onPatch,
}: HarvestCoreFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="harvest-cycle">Cycle</Label>
        <Select
          value={draft.cycleId}
          disabled={disabled || cycleLocked}
          onValueChange={(cycleId) => {
            onPatch({ cycleId });
          }}
        >
          <SelectTrigger id="harvest-cycle" className="w-full">
            <SelectValue placeholder="Choose a cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {`Cycle ${cycle.cycleNo}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {'Only cycles opened on the project appear here. '}
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            className="font-semibold text-clay-600 hover:underline"
          >
            Open the next cycle
          </Link>
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="harvest-date">Harvest date</Label>
        <Input
          id="harvest-date"
          type="date"
          max={indiaToday()}
          disabled={disabled}
          value={draft.harvestedOn}
          onChange={(event) => {
            onPatch({ harvestedOn: event.target.value });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="harvest-yield">Total yield in kg</Label>
        <Input
          id="harvest-yield"
          inputMode="decimal"
          placeholder="18450.50"
          disabled={disabled}
          value={draft.yieldKg}
          onChange={(event) => {
            onPatch({ yieldKg: event.target.value });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="harvest-price">Realised price per kg in rupees</Label>
        <Input
          id="harvest-price"
          inputMode="decimal"
          placeholder="48.75"
          disabled={disabled}
          value={draft.priceRupees}
          onChange={(event) => {
            onPatch({ priceRupees: event.target.value });
          }}
        />
      </div>

      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="harvest-buyer">Buyer</Label>
        <Input
          id="harvest-buyer"
          disabled={disabled}
          value={draft.buyer}
          onChange={(event) => {
            onPatch({ buyer: event.target.value });
          }}
        />
      </div>
    </div>
  );
}
