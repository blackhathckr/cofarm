import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';

type NoStatementYetProps = {
  awaitedCycleNo: number | null;
};

const IN_FIELD =
  'Your crop is still in the field. Yield, the sale price and your share appear here once Kiaan publishes the harvest.';

export function NoStatementYet({ awaitedCycleNo }: NoStatementYetProps) {
  const harvested = awaitedCycleNo !== null;

  return (
    <View className="flex-1 justify-center bg-background px-5">
      <EmptyState
        title={harvested ? 'Statement on its way' : 'Nothing harvested yet'}
        detail={
          harvested
            ? `The harvest for cycle ${awaitedCycleNo.toString()} is in. Your statement is being prepared and will show here shortly.`
            : IN_FIELD
        }
      />
    </View>
  );
}
