import { useLocalSearchParams } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';

import { MisScreen } from '@/features/mis/screens/MisScreen';

export default function Mis() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();

  return (
    <SafeScreen edges={['top']} className="flex-1 bg-background">
      <MisScreen {...(reportId === undefined ? {} : { openReportId: reportId })} />
    </SafeScreen>
  );
}
