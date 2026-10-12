import { documentPageSchema, type DocumentType } from '@cofarm/contracts/documents';

import { request } from './api-client.ts';
import { useCursorList } from './cursor-list.ts';

const PAGE_LIMIT = 20;

export function projectDocumentsKey(projectId: string): readonly unknown[] {
  return ['documents', 'project', projectId];
}

function fetchProjectDocuments(
  projectId: string,
  type: DocumentType | null,
  cursor: string | undefined,
) {
  const params = new URLSearchParams({ projectId, limit: String(PAGE_LIMIT) });
  if (type !== null) params.set('type', type);
  if (cursor !== undefined) params.set('cursor', cursor);

  return request(`/v1/documents?${params.toString()}`, documentPageSchema);
}

/**
 * The API pages on the document id descending, and the id is a uuid v7, so a
 * page is already newest-first and no client-side sort is needed.
 */
export function useProjectDocuments(projectId: string, type: DocumentType | null) {
  return useCursorList({
    queryKey: [...projectDocumentsKey(projectId), type],
    fetchPage: (cursor) => fetchProjectDocuments(projectId, type, cursor),
  });
}
