import type { DocumentType } from '@cofarm/contracts/documents';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { projectDocumentsKey } from '@/lib/document-list.ts';
import { uploadDocument } from '@/lib/document-upload.ts';

type PartnerDocumentInput = {
  file: File;
  projectId: string;
  type: DocumentType;
};

export function useUploadPartnerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PartnerDocumentInput) => uploadDocument(input),
    onSuccess: (_stored, input) =>
      queryClient.invalidateQueries({ queryKey: projectDocumentsKey(input.projectId) }),
  });
}
