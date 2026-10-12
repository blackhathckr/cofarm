import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ErrorNote } from '@/components/ErrorNote';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { indiaToday } from '@/lib/india-date.ts';
import { useOpenCycle } from '../hooks/use-create-project.ts';

type OpenCycleDialogProps = {
  projectId: string;
  nextCycleNo: number;
};

export function OpenCycleDialog({ projectId, nextCycleNo }: OpenCycleDialogProps) {
  const openCycle = useOpenCycle(projectId);
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(indiaToday());
  const [harvestFrom, setHarvestFrom] = useState('');
  const [harvestTo, setHarvestTo] = useState('');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) openCycle.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          {`Open cycle ${nextCycleNo.toString()}`}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Open cycle ${nextCycleNo.toString()}`}</DialogTitle>
          <DialogDescription>
            The five milestone stages are laid out on open, with land preparation active. Costs,
            updates and the harvest all hang off the cycle.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            openCycle.mutate(
              {
                startDate,
                ...(harvestFrom === '' ? {} : { expectedHarvestFrom: harvestFrom }),
                ...(harvestTo === '' ? {} : { expectedHarvestTo: harvestTo }),
              },
              {
                onSuccess: (cycle) => {
                  toast.success(`Cycle ${cycle.cycleNo.toString()} opened`);
                  setIsOpen(false);
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cycle-start">Start date</Label>
            <Input
              id="cycle-start"
              required
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cycle-harvest-from">Harvest expected from</Label>
              <Input
                id="cycle-harvest-from"
                type="date"
                value={harvestFrom}
                onChange={(event) => {
                  setHarvestFrom(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle-harvest-to">Harvest expected to</Label>
              <Input
                id="cycle-harvest-to"
                type="date"
                min={harvestFrom === '' ? undefined : harvestFrom}
                value={harvestTo}
                onChange={(event) => {
                  setHarvestTo(event.target.value);
                }}
              />
            </div>
          </div>

          <ErrorNote error={openCycle.error} />

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={openCycle.isPending}>
              {openCycle.isPending ? 'Opening…' : 'Open cycle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
