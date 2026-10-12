import { MAX_MESSAGE_LENGTH } from '@cofarm/contracts/messaging';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReplyToThread } from '../hooks/use-thread-actions.ts';

type ReplyComposerProps = {
  threadId: string;
  projectId: string;
};

export function ReplyComposer({ threadId, projectId }: ReplyComposerProps) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const reply = useReplyToThread(threadId, projectId);

  return (
    <form
      className="space-y-2 border-t p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim() === '') return;
        reply.mutate(
          { body: body.trim(), ...(file === null ? {} : { file }) },
          {
            onSuccess: () => {
              setBody('');
              setFile(null);
            },
          },
        );
      }}
    >
      <Textarea
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Reply to the partner"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="file"
          className="max-w-xs"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        <Button type="submit" disabled={body.trim() === '' || reply.isPending}>
          {reply.isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
      {reply.error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {reply.error.message}
        </p>
      )}
    </form>
  );
}
