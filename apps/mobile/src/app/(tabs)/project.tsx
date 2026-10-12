import { useLocalSearchParams } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';

import { ProjectStatusScreen } from '@/features/project/screens/ProjectStatusScreen';

export default function Project() {
  const { updateId } = useLocalSearchParams<{ updateId?: string }>();

  return (
    <SafeScreen edges={['top']} className="flex-1 bg-background">
      <ProjectStatusScreen {...(updateId === undefined ? {} : { highlightUpdateId: updateId })} />
    </SafeScreen>
  );
}
