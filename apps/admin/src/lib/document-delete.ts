import { okSchema } from '@cofarm/contracts/primitives';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from './api-client.ts';

export function useDocumentDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      request(`/v1/documents/${documentId}`, okSchema, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}
