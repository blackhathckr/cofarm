import { ErrorNote } from '@/components/ErrorNote';

type InvalidNoteProps = {
  invalid: string | null;
  error: unknown;
  conflict?: string;
};

/** A client-side field complaint hides the server's, so the operator reads one
 * message rather than two. */
export function InvalidNote({ invalid, error, conflict }: InvalidNoteProps) {
  if (invalid !== null) {
    return (
      <p className="text-sm font-medium text-destructive" role="alert">
        {invalid}
      </p>
    );
  }

  return <ErrorNote error={error} {...(conflict === undefined ? {} : { conflict })} />;
}
