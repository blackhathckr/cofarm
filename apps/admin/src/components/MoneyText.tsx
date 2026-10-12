import { formatInr } from '@cofarm/core/money';
import { cn } from 'cn';

type MoneyTextProps = {
  /** Integer paise as a decimal string, exactly as the API sends it. */
  paise: string;
  showPaise?: boolean;
  className?: string;
};

export function MoneyText({ paise, showPaise, className }: MoneyTextProps) {
  return (
    <span className={cn('tabular', className)}>
      {formatInr(BigInt(paise), showPaise === undefined ? {} : { showPaise })}
    </span>
  );
}
