import type { CreatePartnerBody } from '@cofarm/contracts/partners';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPartner } from '../partners.api.ts';

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePartnerBody) => createPartner(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
