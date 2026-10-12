import type { UpdateSummary } from '@cofarm/contracts/updates';
import { Images } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MILESTONE_TAG_LABELS } from '../milestone-tags.ts';

type UpdateCardProps = {
  summary: UpdateSummary;
  onOpen: () => void;
};

function seenByLabel(summary: UpdateSummary): string | null {
  if (summary.seenByCount === null || summary.recipientCount === null) return null;
  return `Seen by ${summary.seenByCount.toString()} of ${summary.recipientCount.toString()} partners`;
}

export function UpdateCard({ summary, onOpen }: UpdateCardProps) {
  const isPublished = summary.status === 'published';
  const seenBy = isPublished ? seenByLabel(summary) : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-sage-200 text-sage-700">
            {MILESTONE_TAG_LABELS[summary.milestoneTag]}
          </Badge>
          <Badge variant={isPublished ? 'default' : 'outline'}>
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>

        <h3 className="font-semibold tracking-tight">{summary.title}</h3>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular">{summary.activityDate}</span>
          <span className="inline-flex items-center gap-1">
            <Images className="size-3" />
            {`${summary.photoCount.toString()} photos`}
          </span>
          {seenBy === null ? null : <span>{seenBy}</span>}
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onOpen}>
        {isPublished ? 'View' : 'Edit draft'}
      </Button>
    </div>
  );
}
