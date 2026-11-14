import { crc32 } from 'node:zlib';

import { XLSX_MIME } from '@cofarm/contracts/documents';
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
 * A minimal single-page PDF. Statements are read through a signed URL, so the
 * object has to exist and open.
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

/** A one-sheet workbook holding the title, so a demo MIS opens in a spreadsheet app. */
function xlsxBytes(title: string): Uint8Array {
  const text = title.replace(/[<>&"]/g, '');
  return storedZip([
    [
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      'xl/workbook.xml',
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Summary" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ],
    [
      'xl/worksheets/sheet1.xml',
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>${text}</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>CoFarm demo document</t></is></c></row></sheetData></worksheet>`,
    ],
  ]);
}

/** An uncompressed zip archive, which is all an .xlsx needs to be. */
function storedZip(entries: readonly (readonly [string, string])[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const partBytes = Buffer.from(content, 'utf8');
    const checksum = crc32(partBytes);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(partBytes.length, 18);
    local.writeUInt32LE(partBytes.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(partBytes.length, 20);
    central.writeUInt32LE(partBytes.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);

    locals.push(local, nameBytes, partBytes);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + partBytes.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Uint8Array.from(Buffer.concat([...locals, directory, end]));
}

function bodyFor(originalName: string, title: string): { body: Uint8Array; mime: string } {
  if (originalName.endsWith('.jpg')) {
    return { body: Uint8Array.from(Buffer.from(PIXEL_JPEG_BASE64, 'base64')), mime: 'image/jpeg' };
  }
  if (originalName.endsWith('.xlsx')) return { body: xlsxBytes(title), mime: XLSX_MIME };
  return { body: pdfBytes(title), mime: 'application/pdf' };
}

/** Writes the object and its confirmed `documents` row, and returns the id. */
export async function createDocument(input: DocumentInput): Promise<string> {
  const documentId = newId();
  const storageKey = buildStorageKey({
    projectId: input.projectId,
    kind: input.kind,
    documentId,
    extension: input.originalName.split('.').at(-1) ?? 'pdf',
  });
  const { body, mime } = bodyFor(input.originalName, input.title);

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
