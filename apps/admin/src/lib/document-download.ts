import { downloadTicketSchema } from '@cofarm/contracts/documents';
import { useMutation, useQuery } from '@tanstack/react-query';

import { request } from './api-client.ts';

function fetchDownloadTicket(documentId: string) {
  return request(`/v1/documents/${documentId}/download-url`, downloadTicketSchema);
}

/**
 * A download URL is signed and expires in minutes, so it is never retained:
 * every render that needs one asks for a fresh ticket.
 */
/** Under the server's signed-URL lifetime, so a held URL is never expired. */
const TICKET_STALE_MS = 4 * 60_000;

export function useDocumentUrl(documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId, 'download-url'],
    queryFn: () => fetchDownloadTicket(documentId),
    staleTime: TICKET_STALE_MS,
    gcTime: TICKET_STALE_MS,
  });
}

export function useDocumentDownload() {
  return useMutation({
    mutationFn: (documentId: string) => fetchDownloadTicket(documentId),
    onSuccess: (ticket) => {
      window.open(ticket.downloadUrl, '_blank', 'noopener,noreferrer');
    },
  });
}
