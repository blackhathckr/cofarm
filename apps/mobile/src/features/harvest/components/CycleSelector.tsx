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
function chipVariant(isSelected: boolean, hasStatement: boolean) {
  if (isSelected) return 'primary' as const;
  return hasStatement ? ('secondary' as const) : ('tertiary' as const);
}

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
          variant={chipVariant(cycle.cycleId === selectedCycleId, cycle.hasStatement)}
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
