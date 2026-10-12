import { useQueries } from '@tanstack/react-query';

import type { Photo } from '@/components/ui/PhotoGrid';
import { fetchPhotoTicket } from '../project.api.ts';

/** Under the server's signed-URL lifetime, so a held URL is never expired. */
const TICKET_STALE_MS = 4 * 60_000;

type PhotoUrls = {
  photos: Photo[];
  isPending: boolean;
  unresolvedCount: number;
};

/**
 * A photo download URL is signed and expires within minutes, so it is fetched
 * only while the gallery is on screen and is never held in the cache after.
 */
export function usePhotoUrls(documentIds: readonly string[], isEnabled: boolean): PhotoUrls {
  return useQueries({
    queries: documentIds.map((documentId) => ({
      queryKey: ['documents', documentId, 'download-url'],
      queryFn: () => fetchPhotoTicket(documentId),
      enabled: isEnabled,
      staleTime: TICKET_STALE_MS,
      gcTime: TICKET_STALE_MS,
      retry: false,
    })),
    combine: (tickets) => ({
      photos: tickets.map((ticket, index) => ({
        id: documentIds[index] ?? `photo-${String(index)}`,
        url: ticket.data?.downloadUrl ?? '',
        ...(ticket.isError ? { caption: 'This photograph could not be loaded.' } : {}),
      })),
      isPending: isEnabled && tickets.some((ticket) => ticket.isPending),
      unresolvedCount: tickets.filter((ticket) => ticket.isError).length,
    }),
  });
}
