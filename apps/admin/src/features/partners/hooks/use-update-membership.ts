import type { UpdateMembershipBody } from '@cofarm/contracts/partners';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMembership } from '../partners.api.ts';

type UpdateMembershipInput = {
  partnerId: string;
  membershipId: string;
  body: UpdateMembershipBody;
};

export function useUpdateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMembershipInput) =>
      updateMembership(input.partnerId, input.membershipId, input.body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}
