import type { PartnerMembership } from '@cofarm/contracts/partners';
import { paiseToRupeeString } from '@cofarm/core/money';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client.ts';
import { useUpdateMembership } from '../hooks/use-update-membership.ts';
import { bpsFromPct, paiseFromRupees } from '../membership-input.ts';
import { FormError } from './FormError';
import { MembershipShareFields } from './MembershipShareFields';

type ShareBasis = PartnerMembership['shareBasis'];
type AgreementStatus = PartnerMembership['agreementStatus'];

type EditMembershipDialogProps = {
  partnerId: string;
  membership: PartnerMembership;
};

const AGREEMENT_STATUSES: AgreementStatus[] = ['not_sent', 'sent', 'signed'];

export function EditMembershipDialog({ partnerId, membership }: EditMembershipDialogProps) {
  const updateMembership = useUpdateMembership();
  const [isOpen, setIsOpen] = useState(false);
  const [rupees, setRupees] = useState(() =>
    paiseToRupeeString(BigInt(membership.contributionPaise)),
  );
  const [shareBasis, setShareBasis] = useState<ShareBasis>(membership.shareBasis);
  const [sharePct, setSharePct] = useState(
    membership.sharePctBps === null ? '' : String(membership.sharePctBps / 100),
  );
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus>(
    membership.agreementStatus,
  );

  const failure = updateMembership.error instanceof ApiError ? updateMembership.error : null;
  const contributionPaise = paiseFromRupees(rupees);
  const sharePctBps = shareBasis === 'fixed_pct' ? bpsFromPct(sharePct) : null;
  const isComplete =
    contributionPaise !== null && (shareBasis !== 'fixed_pct' || sharePctBps !== null);

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
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Membership on ${membership.projectCode}`}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (contributionPaise === null) return;
            updateMembership.mutate(
              {
                partnerId,
                membershipId: membership.id,
                body: {
                  ...(contributionPaise === membership.contributionPaise
                    ? {}
                    : { contributionPaise }),
                  ...(shareBasis === membership.shareBasis ? {} : { shareBasis }),
                  ...(sharePctBps === null || sharePctBps === membership.sharePctBps
                    ? {}
                    : { sharePctBps }),
                  ...(agreementStatus === membership.agreementStatus ? {} : { agreementStatus }),
                },
              },
              {
                onSuccess: () => {
                  toast.success(`${membership.projectCode} membership updated`);
                  setIsOpen(false);
                },
              },
            );
          }}
        >
          <MembershipShareFields
            idPrefix={`edit-${membership.id}`}
            rupees={rupees}
            onRupeesChange={setRupees}
            shareBasis={shareBasis}
            onShareBasisChange={setShareBasis}
            sharePct={sharePct}
            onSharePctChange={setSharePct}
          />

          <div className="space-y-2">
            <Label htmlFor={`edit-${membership.id}-agreement`}>Agreement</Label>
            <Select
              value={agreementStatus}
              onValueChange={(value) => {
                setAgreementStatus(
                  AGREEMENT_STATUSES.find((entry) => entry === value) ?? membership.agreementStatus,
                );
              }}
            >
              <SelectTrigger id={`edit-${membership.id}-agreement`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGREEMENT_STATUSES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormError message={failure === null ? null : failure.message} />

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={updateMembership.isPending || !isComplete}>
              {updateMembership.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
