import type { MilestoneTag, ProjectUpdate } from '@cofarm/contracts/updates';

import { ApiError } from '@/lib/api-client.ts';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import { useCreateUpdate, useEditUpdate, usePublishUpdate } from './use-update-mutations.ts';

export type UpdateDraft = {
  milestoneTag: MilestoneTag;
  title: string;
  description: string;
  activityDate: string;
  notifyPartners: boolean;
  photoDocumentIds: string[];
};

export type SubmitIntent = 'draft' | 'publish';

export function useSubmitUpdate(projectId: string, existing: ProjectUpdate | null) {
  const create = useCreateUpdate(projectId);
  const edit = useEditUpdate(projectId);
  const publish = usePublishUpdate(projectId);
  const nextKey = useIdempotencyKey();

  const submit = async (draft: UpdateDraft, intent: SubmitIntent): Promise<ProjectUpdate> => {
    const idempotencyKey = nextKey(
      JSON.stringify({ draft, intent, updateId: existing === null ? null : existing.id }),
    );

    if (existing === null) {
      return create.mutateAsync({
        body: { ...draft, publish: intent === 'publish' },
        idempotencyKey,
      });
    }

    const saved = await edit.mutateAsync({ updateId: existing.id, body: draft });
    if (intent === 'publish' && saved.status === 'draft') {
      return publish.mutateAsync({ updateId: saved.id, idempotencyKey });
    }
    return saved;
  };

  const error = create.error ?? edit.error ?? publish.error;

  return {
    submit,
    error,
    isPending: create.isPending || edit.isPending || publish.isPending,
    isTakenOver: error instanceof ApiError && error.code === 'already_published',
  };
}
