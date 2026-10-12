import { mobileSchema } from '@cofarm/contracts/primitives';
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
import { useCreatePartner } from '../hooks/use-create-partner.ts';
import { FormError } from './FormError';

export function AddPartnerDialog() {
  const createPartner = useCreatePartner();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('+91');
  const [email, setEmail] = useState('');

  const failure = createPartner.error instanceof ApiError ? createPartner.error : null;
  const mobileTaken = failure?.code === 'partner_mobile_taken' ? failure.message : null;
  const formError = failure === null || mobileTaken !== null ? null : failure.message;
  const isMobileValid = mobileSchema.safeParse(mobile).success;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) createPartner.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Add partner
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a partner</DialogTitle>
          <DialogDescription>
            The account is created without a project. Map a membership from the partner page.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createPartner.mutate(
              { name, mobile, ...(email === '' ? {} : { email }) },
              {
                onSuccess: (partner) => {
                  toast.success(`${partner.name} added`);
                  setIsOpen(false);
                  setName('');
                  setMobile('+91');
                  setEmail('');
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="partner-name">Name</Label>
            <Input
              id="partner-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-mobile">Mobile</Label>
            <Input
              id="partner-mobile"
              required
              placeholder="+919876543210"
              aria-invalid={mobileTaken !== null}
              value={mobile}
              onChange={(event) => {
                setMobile(event.target.value);
              }}
            />
            {mobileTaken === null ? (
              <p className="text-xs text-muted-foreground">Indian mobile, +91XXXXXXXXXX.</p>
            ) : (
              <p role="alert" className="text-xs text-destructive">
                {mobileTaken}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-email">Email (optional)</Label>
            <Input
              id="partner-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>

          <FormError message={formError} />

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={createPartner.isPending || !isMobileValid}>
              {createPartner.isPending ? 'Adding…' : 'Add partner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
