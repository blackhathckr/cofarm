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
import { Textarea } from '@/components/ui/textarea';
import { useIssueDocument } from '../hooks/use-issue-document.ts';
import { IssueTargetFields } from './IssueTargetFields';

export function IssueDocumentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const issue = useIssueDocument();
  const canSubmit = projectId !== null && userId !== null && file !== null && !issue.isPending;

  function submit() {
    if (projectId === null || userId === null || file === null) return;
    issue.mutate(
      { projectId, userId, file, ...(note.trim() === '' ? {} : { note: note.trim() }) },
      {
        onSuccess: (created) => {
          toast.success(`Sent to ${created.partnerName} for signature`);
          setIsOpen(false);
          setUserId(null);
          setNote('');
          setFile(null);
        },
      },
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Issue document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue a document for signature</DialogTitle>
          <DialogDescription>
            The partner acknowledges it in the app. There is no e-sign provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <IssueTargetFields
            projectId={projectId}
            userId={userId}
            onProjectChange={(next) => {
              setProjectId(next);
              setUserId(null);
            }}
            onPartnerChange={setUserId}
          />

          <div className="space-y-2">
            <Label htmlFor="signature-document">Document (PDF)</Label>
            <Input
              id="signature-document"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature-note">Note (optional)</Label>
            <Textarea
              id="signature-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              The note is not kept on the signature request. It becomes the text of the
              partner&apos;s notification, so it will not appear on the row afterwards.
            </p>
          </div>

          {issue.error === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {issue.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {issue.isPending ? 'Uploading…' : 'Send for signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
