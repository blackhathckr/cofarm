import { SafeScreen } from '@/components/ui/SafeScreen';

import { ChatScreen } from '@/features/chat/screens/ChatScreen';

export default function Chat() {
  return (
    <SafeScreen edges={['top']} className="flex-1 bg-background">
      <ChatScreen />
    </SafeScreen>
  );
}
