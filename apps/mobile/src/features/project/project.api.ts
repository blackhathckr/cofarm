import { downloadTicketSchema } from '@cofarm/contracts/documents';
import { projectSchema } from '@cofarm/contracts/projects';
import {
  activityPageSchema,
  projectUpdateSchema,
  updateFeedPageSchema,
} from '@cofarm/contracts/updates';

import { request } from '@/lib/api-client.ts';

function pageQuery(cursor: string | null): string {
  return cursor === null ? '' : `?cursor=${encodeURIComponent(cursor)}`;
}

export function fetchProject(projectId: string) {
  return request(`/v1/projects/${projectId}`, projectSchema);
}

export function fetchUpdateFeed(projectId: string, cursor: string | null) {
  return request(
    `/v1/projects/${projectId}/updates/feed${pageQuery(cursor)}`,
    updateFeedPageSchema,
  );
}

export function fetchActivityLog(projectId: string, cursor: string | null) {
  return request(`/v1/projects/${projectId}/activity${pageQuery(cursor)}`, activityPageSchema);
}

export function fetchPhotoTicket(documentId: string) {
  return request(`/v1/documents/${documentId}/download-url`, downloadTicketSchema);
}

/** Reading one update is what marks it read for the partner. */
export function fetchUpdate(projectId: string, updateId: string) {
  return request(`/v1/projects/${projectId}/updates/${updateId}`, projectUpdateSchema);
}
