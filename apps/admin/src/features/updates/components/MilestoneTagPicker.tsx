import type { MilestoneTag } from '@cofarm/contracts/updates';
import { cn } from 'cn';

import { MILESTONE_TAG_LABELS, MILESTONE_TAG_OPTIONS } from '../milestone-tags.ts';

type MilestoneTagPickerProps = {
  value: MilestoneTag;
  onChange: (tag: MilestoneTag) => void;
  disabled?: boolean;
};

export function MilestoneTagPicker({ value, onChange, disabled }: MilestoneTagPickerProps) {
  return (
    <div role="radiogroup" aria-label="Milestone tag" className="flex flex-wrap gap-2">
      {MILESTONE_TAG_OPTIONS.map((tag) => (
        <button
          key={tag}
          type="button"
          role="radio"
          aria-checked={tag === value}
          disabled={disabled === true}
          onClick={() => {
            onChange(tag);
          }}
          className={cn(
            'inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
            tag === value
              ? 'border-transparent bg-sage-600 text-sage-50'
              : 'border-border bg-card text-muted-foreground hover:bg-sage-100 hover:text-sage-700',
          )}
        >
          {MILESTONE_TAG_LABELS[tag]}
        </button>
      ))}
    </div>
  );
}
