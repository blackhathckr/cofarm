import {
  documentSchema,
  uploadTicketSchema,
  type Document,
  type DocumentMime,
  type DocumentType,
} from '@cofarm/contracts/documents';
import { useMutation } from '@tanstack/react-query';

import { request } from './api-client.ts';
import { checkUpload, DOCUMENT_MIMES } from './upload-limits.ts';

type DocumentUploadInput = {
  file: File;
  projectId: string | null;
  type: DocumentType;
  allowed?: readonly DocumentMime[];
};

export async function uploadDocument({
  file,
  projectId,
  type,
  allowed = DOCUMENT_MIMES,
}: DocumentUploadInput): Promise<Document> {
  const checked = checkUpload(file, allowed);
  if ('rejection' in checked) throw new Error(checked.rejection);

  const ticket = await request('/v1/documents/upload-url', uploadTicketSchema, {
    method: 'POST',
    body: {
      projectId,
      type,
      originalName: file.name,
      mime: checked.mime,
      sizeBytes: file.size,
    },
  });

  /** The storage URL is pre-signed: an Authorization header is not part of the
   * signature and makes the PUT fail, so this one call bypasses the api client. */
  const stored = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': checked.mime },
    body: file,
  });
  if (!stored.ok) throw new Error(`${file.name} could not be stored. Try the upload again.`);

  return request(`/v1/documents/${ticket.documentId}/confirm`, documentSchema, { method: 'POST' });
}

export function useDocumentUpload() {
  return useMutation({ mutationFn: uploadDocument });
}
