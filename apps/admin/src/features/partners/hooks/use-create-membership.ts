import type { CreateMembershipBody } from '@cofarm/contracts/partners';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createMembership } from '../partners.api.ts';

type CreateMembershipInput = {
  partnerId: string;
  body: CreateMembershipBody;
};

export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMembershipInput) => createMembership(input.partnerId, input.body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
