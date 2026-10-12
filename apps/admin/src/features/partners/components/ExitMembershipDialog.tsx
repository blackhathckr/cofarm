import type { PartnerMembership } from '@cofarm/contracts/partners';
import { LogOut } from 'lucide-react';
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
import { useUpdateMembership } from '../hooks/use-update-membership.ts';
import { FormError } from './FormError';

type ExitMembershipDialogProps = {
  partnerId: string;
  membership: PartnerMembership;
};

export function ExitMembershipDialog({ partnerId, membership }: ExitMembershipDialogProps) {
  const updateMembership = useUpdateMembership();
  const [isOpen, setIsOpen] = useState(false);
  const [exitedAt, setExitedAt] = useState(indiaToday);

  const failure = updateMembership.error instanceof ApiError ? updateMembership.error : null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) updateMembership.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs">
          <LogOut />
          Exit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Exit ${membership.projectCode}`}</DialogTitle>
          <DialogDescription>
            The partner keeps their ledger history and loses reach into the project.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMembership.mutate(
              { partnerId, membershipId: membership.id, body: { status: 'exited', exitedAt } },
              {
                onSuccess: () => {
                  toast.success(`Exited ${membership.projectCode}`);
                  setIsOpen(false);
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`exit-${membership.id}-date`}>Exit date</Label>
            <Input
              id={`exit-${membership.id}-date`}
              type="date"
              required
              value={exitedAt}
              onChange={(event) => {
                setExitedAt(event.target.value);
              }}
            />
          </div>

          <FormError message={failure === null ? null : failure.message} />

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              variant="destructive"
              disabled={updateMembership.isPending || exitedAt === ''}
            >
              {updateMembership.isPending ? 'Exiting…' : 'Exit membership'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
