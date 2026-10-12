import type { DocumentType } from '@cofarm/contracts/documents';
import { useMutation } from '@tanstack/react-query';

import { uploadDocument } from '@/lib/document-upload.ts';

type UploadsInput = {
  files: readonly File[];
  projectId: string;
  type: DocumentType;
};

export function useDocumentUploads() {
  return useMutation({
    mutationFn: async (input: UploadsInput): Promise<string[]> => {
      const uploaded: string[] = [];
      for (const file of input.files) {
        const stored = await uploadDocument({
          file,
          projectId: input.projectId,
          type: input.type,
        });
        uploaded.push(stored.id);
      }
      return uploaded;
    },
  });
}
