import { cn } from 'cn';

type ProgressBarProps = {
  /** Basis points, so the value stays integer end to end. */
  valueBps: number;
  className?: string;
};

export function ProgressBar({ valueBps, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, valueBps / 100));

  return (
    <div
      className={cn('h-3 overflow-hidden rounded-full bg-sage-100', className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-sage-600" style={{ width: `${percent}%` }} />
    </div>
  );
}
