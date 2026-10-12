import { cn } from 'cn';
import type { ReactNode } from 'react';

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'plain' | 'sage' | 'clay';
  className?: string;
};

const TONES: Record<NonNullable<StatTileProps['tone']>, string> = {
  plain: 'bg-card text-card-foreground',
  sage: 'bg-sage-100 text-sage-700',
  clay: 'bg-clay-100 text-clay-800',
};

export function StatTile({ label, value, hint, tone = 'plain', className }: StatTileProps) {
  return (
    <div className={cn('rounded-lg border p-4', TONES[tone], className)}>
      <p className="text-xs font-semibold tracking-[0.1em] uppercase opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint === undefined ? null : <p className="mt-0.5 text-xs opacity-70">{hint}</p>}
    </div>
  );
}
