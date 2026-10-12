import { documentMimeSchema, maxUploadBytes, type DocumentMime } from '@cofarm/contracts/documents';

const BYTES_PER_MIB = 1_048_576;

export const DOCUMENT_MIMES: readonly DocumentMime[] = documentMimeSchema.options;

export const IMAGE_MIMES = documentMimeSchema.options.filter((mime) => mime.startsWith('image/'));

export const PDF_MIME: DocumentMime = 'application/pdf';

export function acceptAttribute(mimes: readonly DocumentMime[]): string {
  return mimes.join(',');
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
  const parsed = documentMimeSchema.safeParse(file.type);
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
