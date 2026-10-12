import { cn } from 'cn';
import { View } from 'react-native';

type ProgressBarProps = {
  /** Basis points, so the value stays integer end to end. */
  valueBps: number;
  className?: string;
};

/** HeroUI Native has no progress component, so the cycle bar is ours. */
export function ProgressBar({ valueBps, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, valueBps / 100));

  return (
    <View
      className={cn('h-3 overflow-hidden rounded-full bg-sage-200', className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(percent), min: 0, max: 100 }}
    >
      <View className="h-full rounded-full bg-sage-600" style={{ width: `${percent}%` }} />
    </View>
  );
}
