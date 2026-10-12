import { newId } from '@cofarm/core/id';

import { buildStorageKey, putObject } from '../../infra/storage.ts';
import { db } from '../client.ts';
import { documents } from '../schema.ts';
import type { DocumentType } from './plan.ts';

type DocumentInput = {
  projectId: string | null;
  type: DocumentType;
  kind: string;
  originalName: string;
  title: string;
  uploadedBy: string | null;
  ownerUserId: string | null;
};

/**
 * A 1x1 JPEG. Photo screens need bytes that an image decoder accepts, and a
 * placeholder that actually downloads is worth more for a walkthrough than a
 * row pointing at a missing object.
 */
const PIXEL_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDUzNDP/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiigD//Z';

/**
 * A minimal single-page PDF. Statements and MIS reports are read through a
 * signed URL, so the object has to exist and open.
 */
function pdfBytes(title: string): Uint8Array {
  const text = title.replace(/[()\\]/g, '');
  const body = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]' +
      ' /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${(68 + text.length).toString()} >> stream`,
    `BT /F1 16 Tf 56 760 Td (${text}) Tj ET`,
    'BT /F1 10 Tf 56 735 Td (CoFarm demo document) Tj ET',
    'endstream endobj',
    'trailer << /Root 1 0 R /Size 6 >>',
    '%%EOF',
    '',
  ].join('\n');
  return new TextEncoder().encode(body);
}

/** Writes the object and its confirmed `documents` row, and returns the id. */
export async function createDocument(input: DocumentInput): Promise<string> {
  const isPhoto = input.originalName.endsWith('.jpg');
  const documentId = newId();
  const storageKey = buildStorageKey({
    projectId: input.projectId,
    kind: input.kind,
    documentId,
    extension: isPhoto ? 'jpg' : 'pdf',
  });

  const body = isPhoto
    ? Uint8Array.from(Buffer.from(PIXEL_JPEG_BASE64, 'base64'))
    : pdfBytes(input.title);
  const mime = isPhoto ? 'image/jpeg' : 'application/pdf';

  await putObject(storageKey, body, mime);
  await db.insert(documents).values({
    id: documentId,
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    type: input.type,
    storageKey,
    originalName: input.originalName,
    mime,
    sizeBytes: body.byteLength,
    uploadedBy: input.uploadedBy,
    confirmedAt: new Date(),
  });

  return documentId;
}
