import type { CreateCycleBody, CreateProjectBody, CycleStatus } from '@cofarm/contracts/projects';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCycle, createProject, deleteCycle, setCycleStatus } from '../projects.api.ts';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProjectBody) => createProject(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

export function useOpenCycle(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCycleBody) => createCycle(projectId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'cycles'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
}

function useCycleInvalidation(projectId: string) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'cycles'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };
}

export function useSetCycleStatus(projectId: string) {
  const invalidate = useCycleInvalidation(projectId);

  return useMutation({
    mutationFn: (input: { cycleId: string; status: CycleStatus }) =>
      setCycleStatus(projectId, input.cycleId, input.status),
    onSuccess: invalidate,
  });
}

export function useDeleteCycle(projectId: string) {
  const invalidate = useCycleInvalidation(projectId);

  return useMutation({
    mutationFn: (cycleId: string) => deleteCycle(projectId, cycleId),
    onSuccess: invalidate,
  });
}
