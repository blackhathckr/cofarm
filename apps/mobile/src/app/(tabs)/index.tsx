import { SafeScreen } from '@/components/ui/SafeScreen';

import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen';

export default function Home() {
  return (
    <SafeScreen edges={['top']} className="flex-1 bg-background">
      <DashboardScreen />
    </SafeScreen>
  );
}
