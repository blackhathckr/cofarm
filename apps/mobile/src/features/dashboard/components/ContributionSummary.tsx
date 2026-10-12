import type { PartnerCycle, PartnerProjectCard } from '@cofarm/contracts/dashboard';
import { Text, View } from 'react-native';

import { MoneyText } from '@/components/ui/MoneyText';
import { StatTile } from '@/components/ui/StatTile';

type ContributionSummaryProps = {
  project: PartnerProjectCard;
};

function harvestWindow(cycle: PartnerCycle | null): string {
  if (cycle === null) return 'No cycle yet';
  if (cycle.expectedHarvestFrom === null) return 'To be confirmed';
  if (cycle.expectedHarvestTo === null) return cycle.expectedHarvestFrom;
  return `${cycle.expectedHarvestFrom} → ${cycle.expectedHarvestTo}`;
}

export function ContributionSummary({ project }: ContributionSummaryProps) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <StatTile
          label="Your contribution"
          value={
            <MoneyText
              paise={project.contributionPaise}
              className="text-xl font-extrabold text-foreground"
            />
          }
          hint={`Partner since ${project.joinedAt}`}
        />
        <StatTile label="Project code" value={project.projectCode} hint={project.projectName} />
      </View>

      <View className="flex-row gap-2">
        <StatTile
          label="Variety"
          value={<Text className="text-base font-bold text-foreground">{project.variety}</Text>}
        />
        <StatTile
          label="Harvest window"
          value={
            <Text className="text-base font-bold text-foreground">
              {harvestWindow(project.cycle)}
            </Text>
          }
        />
      </View>
    </View>
  );
}
