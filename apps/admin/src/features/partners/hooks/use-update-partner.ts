import type { UpdatePartnerBody } from '@cofarm/contracts/partners';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updatePartner } from '../partners.api.ts';

type UpdatePartnerInput = {
  partnerId: string;
  body: UpdatePartnerBody;
};

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePartnerInput) => updatePartner(input.partnerId, input.body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
