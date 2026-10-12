import type { Document, DocumentType } from '@cofarm/contracts/documents';
import { useQueries } from '@tanstack/react-query';

import { fetchProjectDocuments } from '../chat.api.ts';
import { LIBRARY_DOCUMENT_KINDS } from '../document-kinds.ts';

export type DocumentGrouping = {
  type: DocumentType;
  title: string;
  documents: readonly Document[];
  hasMore: boolean;
};

type PartnerDocuments = {
  groups: readonly DocumentGrouping[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * One request per kind rather than one unfiltered list: the newest rows on a
 * live project are photographs, which would push the agreement off the first
 * page.
 */
export function usePartnerDocuments(projectId: string, isEnabled: boolean): PartnerDocuments {
  return useQueries({
    queries: LIBRARY_DOCUMENT_KINDS.map((kind) => ({
      queryKey: ['projects', projectId, 'documents', kind.type],
      queryFn: () => fetchProjectDocuments(projectId, kind.type),
      enabled: isEnabled,
    })),
    combine: (pages) => ({
      groups: pages.flatMap((page, index) => {
        const kind = LIBRARY_DOCUMENT_KINDS[index];
        if (kind === undefined || page.data === undefined) return [];
        if (page.data.items.length === 0) return [];

        return [
          {
            type: kind.type,
            title: kind.title,
            documents: page.data.items,
            hasMore: page.data.nextCursor !== null,
          },
        ];
      }),
      isPending: isEnabled && pages.some((page) => page.isPending),
      isError: pages.some((page) => page.isError),
      refetch: () => {
        for (const page of pages) void page.refetch();
      },
    }),
  });
}
