import { useMutation } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useSession } from '@/features/auth/hooks/use-session.ts';
import { API_BASE_URL } from '@/lib/api-client.ts';
import { statementPdfPath } from '../harvest.api.ts';

type StatementPdfRequest = {
  projectId: string;
  projectCode: string;
  cycleId: string;
  cycleNo: number;
};

/**
 * The statement endpoint answers with PDF bytes, so the api client — which
 * parses JSON — cannot carry it; the bearer token is attached by hand and the
 * body is written to the cache and handed to the share sheet — Android will not
 * open a `file://` link from another app.
 */
export function useStatementPdf() {
  const { accessToken } = useSession();

  return useMutation({
    mutationFn: async (statement: StatementPdfRequest) => {
      const response = await fetch(
        `${API_BASE_URL}${statementPdfPath(statement.projectId, statement.cycleId)}`,
        {
          headers: {
            accept: 'application/pdf',
            ...(accessToken === null ? {} : { authorization: `Bearer ${accessToken}` }),
          },
        },
      );
      if (!response.ok) {
        throw new Error('The statement could not be downloaded. Try again in a moment.');
      }

      const pdf = new File(
        Paths.cache,
        `${statement.projectCode}-cycle-${statement.cycleNo}-statement.pdf`,
      );
      pdf.create({ overwrite: true, intermediates: true });
      pdf.write(new Uint8Array(await response.arrayBuffer()));

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error(`Saved as ${pdf.name}, but this device cannot share or open a PDF.`);
      }

      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Cycle ${String(statement.cycleNo)} statement`,
      });

      return pdf.uri;
    },
  });
}
