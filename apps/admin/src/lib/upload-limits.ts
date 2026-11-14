import {
  documentMimeSchema,
  maxUploadBytes,
  XLSX_MIME,
  type DocumentMime,
} from '@cofarm/contracts/documents';

const BYTES_PER_MIB = 1_048_576;

export const DOCUMENT_MIMES: readonly DocumentMime[] = documentMimeSchema.options;

export const IMAGE_MIMES = documentMimeSchema.options.filter((mime) => mime.startsWith('image/'));

export const UPDATE_MEDIA_MIMES: readonly DocumentMime[] = [...IMAGE_MIMES, 'video/mp4'];

export const PDF_MIME: DocumentMime = 'application/pdf';

export const SPREADSHEET_MIMES: readonly DocumentMime[] = [XLSX_MIME];

export function acceptAttribute(mimes: readonly DocumentMime[]): string {
  return mimes.flatMap((mime) => (mime === XLSX_MIME ? [mime, '.xlsx'] : [mime])).join(',');
}

/** A machine without Office reports no type for a workbook, so its extension stands in. */
function typeOf(file: File): string {
  if (file.type === '' && file.name.toLowerCase().endsWith('.xlsx')) return XLSX_MIME;
  return file.type;
}

function inMib(bytes: number): string {
  return `${(Math.round((bytes / BYTES_PER_MIB) * 10) / 10).toString()} MiB`;
}

type UploadCheck = { mime: DocumentMime } | { rejection: string };

/**
 * Checked here as well as on the server so an oversized file is refused before
 * it is pushed across the wire.
 */
export function checkUpload(file: File, allowed: readonly DocumentMime[]): UploadCheck {
  const parsed = documentMimeSchema.safeParse(typeOf(file));
  if (!parsed.success || !allowed.includes(parsed.data)) {
    return {
      rejection: `${file.name} is not an accepted file type. Allowed here: ${allowed.join(', ')}.`,
    };
  }

  const limit = maxUploadBytes(parsed.data);
  if (file.size > limit) {
    return {
      rejection: `${file.name} is ${inMib(file.size)}, over the ${inMib(limit)} limit for this file type.`,
    };
  }

  return { mime: parsed.data };
}
