import type { SendMessageBody, ThreadStatus } from '@cofarm/contracts/messaging';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadDocument } from '@/lib/document-upload.ts';
import { reopenThread, resolveThread, sendThreadMessage } from '../messaging.api.ts';

type ReplyInput = {
  body: string;
  file?: File;
};

function useThreadInvalidation(threadId: string) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['threads', 'detail', threadId] }),
      queryClient.invalidateQueries({ queryKey: ['threads'] }),
    ]);
  };
}

/** Answering the partner is what marks their messages read, so the list count
 * has to be refetched alongside the transcript. */
export function useReplyToThread(threadId: string, projectId: string) {
  const invalidate = useThreadInvalidation(threadId);

  return useMutation({
    mutationFn: async ({ body, file }: ReplyInput) => {
      const attachment =
        file === undefined ? null : await uploadDocument({ projectId, file, type: 'other' });
      const payload: SendMessageBody = {
        body,
        ...(attachment === null ? {} : { documentId: attachment.id }),
      };
      return sendThreadMessage(threadId, payload);
    },
    onSuccess: invalidate,
  });
}

export function useSetThreadStatus(threadId: string) {
  const invalidate = useThreadInvalidation(threadId);

  return useMutation({
    mutationFn: (status: ThreadStatus) =>
      status === 'resolved' ? resolveThread(threadId) : reopenThread(threadId),
    onSuccess: invalidate,
  });
}
