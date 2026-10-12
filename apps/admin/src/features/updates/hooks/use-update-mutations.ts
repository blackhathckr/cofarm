import type { CreateUpdateBody, EditUpdateBody } from '@cofarm/contracts/updates';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  createUpdate,
  deleteUpdate,
  editUpdate,
  publishUpdate,
  unpublishUpdate,
} from '../updates.api.ts';

function invalidateUpdates(queryClient: QueryClient, projectId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['updates', projectId] });
}

export function useCreateUpdate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { body: CreateUpdateBody; idempotencyKey: string }) =>
      createUpdate(projectId, vars.body, vars.idempotencyKey),
    onSuccess: () => {
      invalidateUpdates(queryClient, projectId);
    },
  });
}

export function useEditUpdate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { updateId: string; body: EditUpdateBody }) =>
      editUpdate(projectId, vars.updateId, vars.body),
    onSuccess: () => {
      invalidateUpdates(queryClient, projectId);
    },
  });
}

export function useUnpublishUpdate(projectId: string, updateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idempotencyKey: string) => unpublishUpdate(projectId, updateId, idempotencyKey),
    onSettled: () => {
      invalidateUpdates(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePublishUpdate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { updateId: string; idempotencyKey: string }) =>
      publishUpdate(projectId, vars.updateId, vars.idempotencyKey),
    onSettled: () => {
      invalidateUpdates(queryClient, projectId);
    },
  });
}

export function useDeleteUpdate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updateId: string) => deleteUpdate(projectId, updateId),
    onSuccess: () => {
      invalidateUpdates(queryClient, projectId);
    },
  });
}
