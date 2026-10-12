import type { Cycle, SetMilestoneBody } from '@cofarm/contracts/projects';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setMilestone } from '../projects.api.ts';

export function useSetMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<Cycle, Error, { cycleId: string; body: SetMilestoneBody }>({
    mutationFn: (input) => setMilestone(projectId, input.cycleId, input.body),
    // The endpoint answers with the updated cycle, so it is written straight
    // into the list. Invalidating refetched every cycle on each keystroke.
    onSuccess: (cycle) => {
      queryClient.setQueryData<Cycle[]>(['projects', projectId, 'cycles'], (current) =>
        current?.map((row) => (row.id === cycle.id ? cycle : row)),
      );
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId], exact: true });
    },
  });
}
