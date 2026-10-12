import type { ProjectUpdate } from '@cofarm/contracts/updates';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client.ts';
import { indiaToday } from '@/lib/india-date.ts';
import {
  useSubmitUpdate,
  type SubmitIntent,
  type UpdateDraft,
} from '../hooks/use-submit-update.ts';
import { MilestoneTagPicker } from './MilestoneTagPicker';
import { UpdateDateFields } from './UpdateDateFields';
import { UpdateFormActions } from './UpdateFormActions';
import { UpdatePhotoPicker } from './UpdatePhotoPicker';

const TITLE_LIMIT = 80;

type UpdateComposeFormProps = {
  projectId: string;
  update?: ProjectUpdate;
  onSaved?: (saved: ProjectUpdate) => void;
};

function draftOf(update: ProjectUpdate | undefined): UpdateDraft {
  if (update === undefined) {
    return {
      milestoneTag: 'general',
      title: '',
      description: '',
      activityDate: indiaToday(),
      notifyPartners: false,
      photoDocumentIds: [],
    };
  }

  return {
    milestoneTag: update.milestoneTag,
    title: update.title,
    description: update.description,
    activityDate: update.activityDate,
    notifyPartners: update.notifyPartners,
    photoDocumentIds: update.photos.map((photo) => photo.documentId),
  };
}

function dateProblemOf(error: Error | null): string | null {
  if (!(error instanceof ApiError)) return null;
  const isDateProblem =
    error.code === 'bad_request' ||
    error.fields.some((field) => field.path.includes('activityDate'));
  return isDateProblem ? error.message : null;
}

export function UpdateComposeForm({ projectId, update, onSaved }: UpdateComposeFormProps) {
  const [draft, setDraft] = useState<UpdateDraft>(() => draftOf(update));
  const { submit, error, isPending, isTakenOver } = useSubmitUpdate(projectId, update ?? null);

  const isPublished = update?.status === 'published';
  const dateProblem = dateProblemOf(error);

  const run = (intent: SubmitIntent): void => {
    void (async () => {
      const saved = await submit(draft, intent).catch(() => null);
      if (saved === null) return;
      if (update === undefined) setDraft(draftOf(undefined));
      onSaved?.(saved);
    })();
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        run(isPublished ? 'draft' : 'publish');
      }}
    >
      <div className="space-y-2">
        <Label>Milestone tag</Label>
        <MilestoneTagPicker
          value={draft.milestoneTag}
          disabled={isPending}
          onChange={(milestoneTag) => {
            setDraft({ ...draft, milestoneTag });
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="update-title">Title</Label>
          <span className="tabular text-xs text-muted-foreground">
            {`${draft.title.length.toString()} / ${TITLE_LIMIT.toString()}`}
          </span>
        </div>
        <Input
          id="update-title"
          required
          maxLength={TITLE_LIMIT}
          value={draft.title}
          onChange={(event) => {
            setDraft({ ...draft, title: event.target.value });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="update-description">What happened</Label>
        <Textarea
          id="update-description"
          required
          rows={6}
          value={draft.description}
          onChange={(event) => {
            setDraft({ ...draft, description: event.target.value });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <UpdatePhotoPicker
          projectId={projectId}
          documentIds={draft.photoDocumentIds}
          disabled={isPending}
          onChange={(photoDocumentIds) => {
            setDraft({ ...draft, photoDocumentIds });
          }}
        />
      </div>

      <UpdateDateFields
        activityDate={draft.activityDate}
        notifyPartners={draft.notifyPartners}
        dateProblem={dateProblem}
        onActivityDateChange={(activityDate) => {
          setDraft({ ...draft, activityDate });
        }}
        onNotifyPartnersChange={(notifyPartners) => {
          setDraft({ ...draft, notifyPartners });
        }}
      />

      <UpdateFormActions
        isPublished={isPublished}
        isPending={isPending}
        isTakenOver={isTakenOver}
        message={error === null || dateProblem !== null || isTakenOver ? null : error.message}
        onSaveDraft={() => {
          run('draft');
        }}
      />
    </form>
  );
}
