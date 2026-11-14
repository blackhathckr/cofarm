import { downloadTicketSchema, XLSX_MIME, type DownloadTicket } from '@cofarm/contracts/documents';
import { useMutation } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { request } from './api-client.ts';

export function fetchDownloadTicket(documentId: string) {
  return request(`/v1/documents/${documentId}/download-url`, downloadTicketSchema);
}

/**
 * The in-app browser keeps the partner in the app, but it is a native module:
 * a build made before it was added has to fall back rather than throw.
 */
async function openInBrowser(url: string): Promise<void> {
  try {
    const browser = await import('expo-web-browser');
    await browser.openBrowserAsync(url, { enableBarCollapsing: true, showTitle: true });
  } catch {
    await Linking.openURL(url);
  }
}

/** Android's view intent, which offers "Open with" Excel or Sheets rather than a send list. */
async function viewOnAndroid(workbook: File): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const launcher = await import('expo-intent-launcher').catch(() => null);
  if (launcher === null) return false;

  await launcher
    .startActivityAsync('android.intent.action.VIEW', {
      data: workbook.contentUri,
      type: XLSX_MIME,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    })
    .catch(() => {
      throw new Error('Install Excel or Google Sheets to open the report.');
    });
  return true;
}

const FLAG_GRANT_READ_URI_PERMISSION = 1;

/** A browser cannot show a workbook, so it is saved and handed to a spreadsheet app. */
async function openWorkbook(ticket: DownloadTicket): Promise<void> {
  const target = new File(Paths.cache, ticket.originalName.replaceAll('/', '-'));
  const workbook = await File.downloadFileAsync(ticket.downloadUrl, target, { idempotent: true });

  if (await viewOnAndroid(workbook)) return;
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('This phone has no app that can open the workbook.');
  }
  await Sharing.shareAsync(workbook.uri, {
    mimeType: XLSX_MIME,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: ticket.originalName,
  });
}

/**
 * A mutation rather than a query: the signed URL is short-lived and must never
 * be served from cache.
 */
export function useDocumentDownload() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const ticket = await fetchDownloadTicket(documentId);
      if (ticket.mime === XLSX_MIME) await openWorkbook(ticket);
      else await openInBrowser(ticket.downloadUrl);
      return ticket;
    },
  });
}
