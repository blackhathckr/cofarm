import { useQuery } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchMisReceipts, fetchMisReport, fetchMisReports } from '../mis.api.ts';

export function useMisReports(projectId: string) {
  return useCursorList({
    queryKey: ['mis', projectId, 'list'],
    fetchPage: (cursor) => fetchMisReports(projectId, { cursor }),
  });
}

export function useMisReport(projectId: string, reportId: string) {
  return useQuery({
    queryKey: ['mis', projectId, 'detail', reportId],
    queryFn: () => fetchMisReport(projectId, reportId),
  });
}

export function useMisReceipts(projectId: string, reportId: string) {
  return useQuery({
    queryKey: ['mis', projectId, 'receipts', reportId],
    queryFn: () => fetchMisReceipts(projectId, reportId),
  });
}
