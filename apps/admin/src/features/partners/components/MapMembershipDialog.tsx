import type { PartnerMembership } from '@cofarm/contracts/partners';
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
import { useCreateMembership } from '../hooks/use-create-membership.ts';
import { bpsFromPct, paiseFromRupees } from '../membership-input.ts';
import { FormError } from './FormError';
import { MembershipShareFields } from './MembershipShareFields';
import { ProjectSelectField } from './ProjectSelectField';

type ShareBasis = PartnerMembership['shareBasis'];

type MapMembershipDialogProps = {
  partnerId: string;
  mappedProjectIds: string[];
};

export function MapMembershipDialog({ partnerId, mappedProjectIds }: MapMembershipDialogProps) {
  const createMembership = useCreateMembership();
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [rupees, setRupees] = useState('');
  const [shareBasis, setShareBasis] = useState<ShareBasis>('pro_rata_contribution');
  const [sharePct, setSharePct] = useState('');
  const [joinedAt, setJoinedAt] = useState(indiaToday);

  const failure = createMembership.error instanceof ApiError ? createMembership.error : null;
  const contributionPaise = paiseFromRupees(rupees);
  const sharePctBps = shareBasis === 'fixed_pct' ? bpsFromPct(sharePct) : null;
  const isComplete =
    projectId !== '' &&
    contributionPaise !== null &&
    joinedAt !== '' &&
    (shareBasis !== 'fixed_pct' || sharePctBps !== null);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) createMembership.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Map membership
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map a membership</DialogTitle>
          <DialogDescription>
            A membership is what gives this partner reach into a project.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (contributionPaise === null) return;
            createMembership.mutate(
              {
                partnerId,
                body: {
                  projectId,
                  contributionPaise,
                  shareBasis,
                  joinedAt,
                  ...(sharePctBps === null ? {} : { sharePctBps }),
                },
              },
              {
                onSuccess: (membership) => {
                  toast.success(`Mapped to ${membership.projectCode}`);
                  setIsOpen(false);
                  setProjectId('');
                  setRupees('');
                  setShareBasis('pro_rata_contribution');
                  setSharePct('');
                },
              },
            );
          }}
        >
          <ProjectSelectField
            value={projectId}
            onChange={setProjectId}
            excludeProjectIds={mappedProjectIds}
          />

          <MembershipShareFields
            idPrefix="map"
            rupees={rupees}
            onRupeesChange={setRupees}
            shareBasis={shareBasis}
            onShareBasisChange={setShareBasis}
            sharePct={sharePct}
            onSharePctChange={setSharePct}
          />

          <div className="space-y-2">
            <Label htmlFor="membership-joined">Joined on</Label>
            <Input
              id="membership-joined"
              type="date"
              required
              value={joinedAt}
              onChange={(event) => {
                setJoinedAt(event.target.value);
              }}
            />
          </div>

          <FormError message={failure === null ? null : failure.message} />

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={createMembership.isPending || !isComplete}>
              {createMembership.isPending ? 'Mapping…' : 'Map membership'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
