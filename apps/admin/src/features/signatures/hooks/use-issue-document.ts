import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadDocument } from '@/lib/document-upload.ts';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import { PDF_MIME } from '@/lib/upload-limits.ts';
import { issueSignature } from '../signatures.api.ts';

type IssueDocumentInput = {
  projectId: string;
  userId: string;
  file: File;
  note?: string;
};

export function useIssueDocument() {
  const queryClient = useQueryClient();
  const nextKey = useIdempotencyKey();

  return useMutation({
    mutationFn: async ({ projectId, userId, file, note }: IssueDocumentInput) => {
      const document = await uploadDocument({
        projectId,
        file,
        type: 'agreement',
        allowed: [PDF_MIME],
      });
      const body = {
        documentId: document.id,
        userId,
        ...(note === undefined ? {} : { note }),
      };
      return issueSignature(projectId, body, nextKey(`${projectId}:${userId}:${document.id}`));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['signatures'] });
    },
  });
}
