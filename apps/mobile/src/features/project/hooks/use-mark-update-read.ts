import { useMutation } from '@tanstack/react-query';

import { fetchUpdate } from '../project.api.ts';

type MarkUpdateRead = { projectId: string; updateId: string };

export function useMarkUpdateRead() {
  return useMutation({
    mutationFn: ({ projectId, updateId }: MarkUpdateRead) => fetchUpdate(projectId, updateId),
  });
}
