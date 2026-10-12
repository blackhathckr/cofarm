import type { Message } from '@cofarm/contracts/messaging';
import { cn } from 'cn';
import { Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatMessageTime } from '../message-times.ts';

type MessageBubbleProps = {
  message: Message;
  onViewDocument: (documentId: string) => void;
};

export function MessageBubble({ message, onViewDocument }: MessageBubbleProps) {
  const isAdmin = message.senderKind === 'admin';
  const documentId = message.documentId;

  return (
    <div className={cn('flex flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-prose rounded-lg px-3 py-2 text-sm',
          isAdmin ? 'bg-clay-100 text-clay-900' : 'border bg-card text-card-foreground',
        )}
      >
        <p className="text-xs font-semibold opacity-70">{message.senderName}</p>
        <p className="mt-1 whitespace-pre-wrap">{message.body}</p>

        {documentId === null ? null : (
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-background p-2">
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Attached document</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                onViewDocument(documentId);
              }}
            >
              Open
            </Button>
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{formatMessageTime(message.sentAt)}</span>
    </div>
  );
}
