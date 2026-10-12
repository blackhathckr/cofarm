import { projectCodeSchema } from '@cofarm/contracts/primitives';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { ApiError } from '@/lib/api-client.ts';
import { indiaToday } from '@/lib/india-date.ts';
import { parseRupeeAmount } from '@/lib/rupee-input.ts';
import { useCreateProject } from '../hooks/use-create-project.ts';

const KIAAN_SHARE_BPS = 5000;

const BLANK = {
  code: '',
  name: '',
  location: '',
  acreageAcres: '',
  variety: '',
  startDate: indiaToday(),
  capacityRupees: '',
};

export function CreateProjectDialog() {
  const createProject = useCreateProject();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const set = (key: keyof typeof BLANK) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const failure = createProject.error instanceof ApiError ? createProject.error : null;
  const codeTaken = failure?.code === 'project_code_taken' ? failure.message : null;
  const formError = failure === null || codeTaken !== null ? null : failure.message;
  const isCodeValid = projectCodeSchema.safeParse(form.code).success;
  const capacity = parseRupeeAmount(form.capacityRupees);
  const capacityError = form.capacityRupees === '' ? null : capacity.error;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) createProject.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New project
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            A project opens with no cycle. Open cycle 1 from the project page once it exists.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createProject.mutate(
              {
                code: form.code,
                name: form.name,
                location: form.location,
                acreageAcres: Number(form.acreageAcres),
                variety: form.variety,
                startDate: form.startDate,
                capacityPaise: capacity.paise ?? '0',
                // The agreed split is 50/50 on net proceeds for every block.
                kiaanShareBps: KIAAN_SHARE_BPS,
              },
              {
                onSuccess: (project) => {
                  toast.success(`${project.code} created`);
                  setIsOpen(false);
                  setForm(BLANK);
                },
              },
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-code">Project code</Label>
              <Input
                id="project-code"
                required
                placeholder="MYSBN06"
                aria-invalid={codeTaken !== null}
                value={form.code}
                onChange={(event) => {
                  set('code')(event.target.value.toUpperCase());
                }}
              />
              {codeTaken === null ? (
                <p className="text-xs text-muted-foreground">Uppercase letters and digits.</p>
              ) : (
                <p role="alert" className="text-xs text-destructive">
                  {codeTaken}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                required
                minLength={2}
                placeholder="Hunsur Block 6"
                value={form.name}
                onChange={(event) => {
                  set('name')(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-location">Location</Label>
              <Input
                id="project-location"
                required
                minLength={2}
                placeholder="Hunsur, Mysore"
                value={form.location}
                onChange={(event) => {
                  set('location')(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-variety">Variety</Label>
              <Input
                id="project-variety"
                required
                minLength={2}
                placeholder="Yelakki"
                value={form.variety}
                onChange={(event) => {
                  set('variety')(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-acreage">Acres</Label>
              <Input
                id="project-acreage"
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="10"
                value={form.acreageAcres}
                onChange={(event) => {
                  set('acreageAcres')(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                required
                type="date"
                max={indiaToday()}
                value={form.startDate}
                onChange={(event) => {
                  set('startDate')(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-capacity">Capacity in rupees (optional)</Label>
            <Input
              id="project-capacity"
              inputMode="numeric"
              placeholder="40,00,000"
              value={form.capacityRupees}
              onChange={(event) => {
                set('capacityRupees')(event.target.value);
              }}
            />
            {capacityError === null ? (
              <p className="text-xs text-muted-foreground">
                Total contribution the block can take. Kiaan keeps 50% of net proceeds.
              </p>
            ) : (
              <p role="alert" className="text-xs text-destructive">
                {capacityError}
              </p>
            )}
          </div>

          {formError === null ? null : (
            <p role="alert" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={createProject.isPending || !isCodeValid || capacityError !== null}
            >
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
