import { downloadTicketSchema } from '@cofarm/contracts/documents';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';

import { request } from './api-client.ts';

export function fetchDownloadTicket(documentId: string) {
  return request(`/v1/documents/${documentId}/download-url`, downloadTicketSchema);
}

/**
 * The in-app browser keeps the partner in the app, but it is a native module:
 * a build made before it was added has to fall back rather than throw.
 */
async function openDocument(url: string): Promise<void> {
  try {
    const browser = await import('expo-web-browser');
    await browser.openBrowserAsync(url, { enableBarCollapsing: true, showTitle: true });
  } catch {
    await Linking.openURL(url);
  }
}

/**
 * A mutation rather than a query: the signed URL is short-lived and must never
 * be served from cache.
 */
export function useDocumentDownload() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const ticket = await fetchDownloadTicket(documentId);
      await openDocument(ticket.downloadUrl);
      return ticket;
    },
  });
}
