import { ApiError } from '@/lib/api-client.ts';

/** Conflicts the server reports as a code rather than a field path. */
const CODE_FIELDS: Record<string, string> = {
  email_taken: 'email',
  role_key_taken: 'key',
};

export function fieldError(error: Error | null, field: string): string | null {
  if (!(error instanceof ApiError)) return null;
  if (CODE_FIELDS[error.code] === field) return error.message;

  return error.fields.find((entry) => entry.path.endsWith(field))?.message ?? null;
}

export function formError(
  error: Error | null,
  handledFields: readonly string[] = [],
): string | null {
  if (error === null) return null;
  if (!(error instanceof ApiError)) return error.message;

  const codeField = CODE_FIELDS[error.code];
  if (codeField !== undefined && handledFields.includes(codeField)) return null;

  const isHandled = error.fields.some((entry) =>
    handledFields.some((field) => entry.path.endsWith(field)),
  );
  return isHandled && error.fields.length === 1 ? null : error.message;
}
