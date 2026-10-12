import { formatInr } from '@cofarm/core/money';
import { Text } from 'react-native';

type MoneyTextProps = {
  /** Integer paise as a decimal string, exactly as the API sends it. */
  paise: string;
  showPaise?: boolean;
  className?: string;
};

export function MoneyText({ paise, showPaise, className = '' }: MoneyTextProps) {
  return (
    <Text className={className}>
      {formatInr(BigInt(paise), showPaise === undefined ? {} : { showPaise })}
    </Text>
  );
}
