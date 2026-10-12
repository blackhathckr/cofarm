import { ApiError } from '@/lib/api-client.ts';

type ErrorNoteProps = {
  error: unknown;
  conflict?: string;
};

function describe(error: unknown, conflict: string | undefined): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Something went wrong';
  }
  if (error.status === 409 && conflict !== undefined) return conflict;
  if (error.fields.length > 0) {
    return error.fields.map((field) => `${field.path}: ${field.message}`).join(' · ');
  }
  return error.message;
}

export function ErrorNote({ error, conflict }: ErrorNoteProps) {
  if (error === null || error === undefined) return null;

  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {describe(error, conflict)}
    </p>
  );
}
