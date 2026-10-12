import type { Partner, PartnerStatus } from '@cofarm/contracts/partners';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client.ts';
import { useUpdatePartner } from '../hooks/use-update-partner.ts';
import { FormError } from './FormError';

type EditPartnerDialogProps = {
  partner: Partner;
};

const STATUSES: PartnerStatus[] = ['active', 'suspended', 'deleted'];

export function EditPartnerDialog({ partner }: EditPartnerDialogProps) {
  const updatePartner = useUpdatePartner();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(partner.name);
  const [email, setEmail] = useState(partner.email ?? '');
  const [status, setStatus] = useState<PartnerStatus>(partner.status);

  const failure = updatePartner.error instanceof ApiError ? updatePartner.error : null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setName(partner.name);
          setEmail(partner.email ?? '');
          setStatus(partner.status);
          return;
        }
        updatePartner.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit profile
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            updatePartner.mutate(
              {
                partnerId: partner.id,
                body: {
                  ...(name === partner.name ? {} : { name }),
                  ...(email === '' || email === partner.email ? {} : { email }),
                  ...(status === partner.status ? {} : { status }),
                },
              },
              {
                onSuccess: () => {
                  toast.success('Profile updated');
                  setIsOpen(false);
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-partner-name">Name</Label>
            <Input
              id="edit-partner-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-partner-email">Email</Label>
            <Input
              id="edit-partner-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-partner-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(STATUSES.find((entry) => entry === value) ?? partner.status);
              }}
            >
              <SelectTrigger id="edit-partner-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormError message={failure === null ? null : failure.message} />

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={updatePartner.isPending}>
              {updatePartner.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
