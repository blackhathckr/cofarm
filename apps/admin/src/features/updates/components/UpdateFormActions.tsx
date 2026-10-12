import { Button } from '@/components/ui/button';

type UpdateFormActionsProps = {
  isPublished: boolean;
  isPending: boolean;
  isTakenOver: boolean;
  message: string | null;
  onSaveDraft: () => void;
};

export function UpdateFormActions({
  isPublished,
  isPending,
  isTakenOver,
  message,
  onSaveDraft,
}: UpdateFormActionsProps) {
  return (
    <div className="space-y-3">
      {isTakenOver ? (
        <p role="alert" className="rounded-md bg-clay-100 p-3 text-sm text-clay-800">
          Someone else published this update first. It has been refreshed with their version.
        </p>
      ) : null}
      {message === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={isPending} onClick={onSaveDraft}>
          {isPublished ? 'Save changes' : 'Save draft'}
        </Button>
        {isPublished ? null : (
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Working…' : 'Publish'}
          </Button>
        )}
      </div>
    </div>
  );
}
