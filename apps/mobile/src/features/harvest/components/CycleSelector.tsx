import { Chip } from 'heroui-native';
import { ScrollView } from 'react-native';

export type CycleOption = {
  cycleId: string;
  cycleNo: number;
  /** False when the cycle has no statement for this partner yet. */
  hasStatement: boolean;
};

type CycleSelectorProps = {
  cycles: readonly CycleOption[];
  selectedCycleId: string;
  onSelect: (cycleId: string) => void;
};

/**
 * Every cycle on the project, not only the ones already settled, so a partner
 * can see that cycle 3 exists and is still running.
 */
export function CycleSelector({ cycles, selectedCycleId, onSelect }: CycleSelectorProps) {
  if (cycles.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2 py-1"
    >
      {cycles.map((cycle) => (
        <Chip
          key={cycle.cycleId}
          size="sm"
          variant={
            cycle.cycleId === selectedCycleId
              ? 'primary'
              : cycle.hasStatement
                ? 'secondary'
                : 'tertiary'
          }
          accessibilityLabel={
            cycle.hasStatement
              ? `Cycle ${String(cycle.cycleNo)}`
              : `Cycle ${String(cycle.cycleNo)}, no statement yet`
          }
          onPress={() => {
            onSelect(cycle.cycleId);
          }}
        >
          {`Cycle ${String(cycle.cycleNo)}`}
        </Chip>
      ))}
    </ScrollView>
  );
}
