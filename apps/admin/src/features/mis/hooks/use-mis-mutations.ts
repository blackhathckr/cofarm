import type { CreateMisBody, UpdateMisBody } from '@cofarm/contracts/mis';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  composeMisReport,
  createMisReport,
  deleteMisReport,
  publishMisReport,
  unpublishMisReport,
  updateMisReport,
} from '../mis.api.ts';

function invalidateMis(queryClient: QueryClient, projectId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['mis', projectId] });
}

export function useCreateMisReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { body: CreateMisBody; idempotencyKey: string }) =>
      createMisReport(projectId, vars.body, vars.idempotencyKey),
    onSuccess: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}

export function useUpdateMisReport(projectId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateMisBody) => updateMisReport(projectId, reportId, body),
    onSuccess: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}

export function useUnpublishMisReport(projectId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idempotencyKey: string) => unpublishMisReport(projectId, reportId, idempotencyKey),
    onSettled: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}

export function usePublishMisReport(projectId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idempotencyKey: string) => publishMisReport(projectId, reportId, idempotencyKey),
    onSettled: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}

export function useComposeMisReport(projectId: string, reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => composeMisReport(projectId, reportId),
    onSuccess: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}

export function useDeleteMisReport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => deleteMisReport(projectId, reportId),
    onSuccess: () => {
      invalidateMis(queryClient, projectId);
    },
  });
}
