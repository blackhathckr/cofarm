import { SafeScreen } from '@/components/ui/SafeScreen';

import { HarvestScreen } from '@/features/harvest/screens/HarvestScreen';

export default function Harvest() {
  return (
    <SafeScreen edges={['top']} className="flex-1 bg-background">
      <HarvestScreen />
    </SafeScreen>
  );
}
