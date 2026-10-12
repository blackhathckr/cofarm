import type { Harvest } from '@cofarm/contracts/harvest';
import type { Cycle } from '@cofarm/contracts/projects';
import { useState, type SyntheticEvent } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { initialDraft, validateHarvestDraft, type HarvestDraft } from '../harvest-draft.ts';
import { useCreateHarvest, useUpdateHarvest } from '../hooks/use-harvests.ts';
import { parseKilograms } from '../kilogram-input.ts';
import { DocumentListPicker } from './DocumentListPicker';
import { HarvestCoreFields } from './HarvestCoreFields';
import { VarietySplitEditor } from './VarietySplitEditor';

type HarvestFormProps = {
  projectId: string;
  harvest: Harvest | null;
  cycles: readonly Cycle[];
  onSaved: (harvest: Harvest) => void;
};

const ALREADY_PUBLISHED =
  'This harvest is already published and can no longer be edited. Reload to see it read-only.';

function submitLabel(pending: boolean, isDraft: boolean): string {
  if (pending) return 'Saving…';
  return isDraft ? 'Save draft' : 'Save changes';
}

export function HarvestForm({ projectId, harvest, cycles, onSaved }: HarvestFormProps) {
  const [draft, setDraft] = useState<HarvestDraft>(() => initialDraft(harvest));
  const [invalid, setInvalid] = useState<string | null>(null);
  const create = useCreateHarvest(projectId);
  const update = useUpdateHarvest(projectId);

  const saved = harvest ?? create.data ?? null;
  const readOnly = saved !== null && saved.status === 'published';
  const pending = create.isPending || update.isPending;

  function patch(next: Partial<HarvestDraft>): void {
    setDraft((current) => ({ ...current, ...next }));
  }

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const checked = validateHarvestDraft(draft);
    if (checked.error !== null) {
      setInvalid(checked.error);
      return;
    }
    setInvalid(null);

    if (saved === null) {
      create.mutate({ cycleId: draft.cycleId, ...checked.fields }, { onSuccess: onSaved });
      return;
    }
    update.mutate({ harvestId: saved.id, body: checked.fields }, { onSuccess: onSaved });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {readOnly ? (
        <Alert>
          <AlertTitle>Published and read-only</AlertTitle>
          <AlertDescription>
            A published harvest cannot be edited. Corrections are appended to the ledger instead.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Gross revenue"
          value={
            saved === null ? (
              'Computed on save'
            ) : (
              <MoneyText paise={saved.grossRevenuePaise} showPaise />
            )
          }
          hint="the server computes this from yield and realised price"
          tone="sage"
        />
        <StatTile label="Status" value={saved === null ? 'Not saved yet' : saved.status} />
      </div>

      <HarvestCoreFields
        draft={draft}
        projectId={projectId}
        cycles={cycles}
        disabled={readOnly}
        cycleLocked={saved !== null}
        onPatch={patch}
      />

      <VarietySplitEditor
        rows={draft.rows}
        yieldKg={parseKilograms(draft.yieldKg).kg ?? '0'}
        disabled={readOnly}
        onChange={(rows) => {
          patch({ rows });
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DocumentListPicker
          label="Weighment slips"
          projectId={projectId}
          type="weighment_slip"
          documentIds={draft.weighmentSlipDocumentIds}
          disabled={readOnly}
          onChange={(weighmentSlipDocumentIds) => {
            patch({ weighmentSlipDocumentIds });
          }}
        />
        <DocumentListPicker
          label="Harvest photos"
          projectId={projectId}
          type="harvest_photo"
          documentIds={draft.harvestPhotoDocumentIds}
          disabled={readOnly}
          onChange={(harvestPhotoDocumentIds) => {
            patch({ harvestPhotoDocumentIds });
          }}
        />
      </div>

      {invalid === null ? (
        <ErrorNote error={create.error ?? update.error} conflict={ALREADY_PUBLISHED} />
      ) : (
        <p className="text-sm font-medium text-destructive" role="alert">
          {invalid}
        </p>
      )}

      {readOnly ? null : (
        <Button type="submit" disabled={pending}>
          {submitLabel(pending, saved === null)}
        </Button>
      )}
    </form>
  );
}
