import type { Message } from '@cofarm/contracts/messaging';
import type { MySignatureRequest } from '@cofarm/contracts/signatures';
import { Text } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadMore } from '@/components/ui/LoadMore';
import { MessageBubble } from './MessageBubble';
import { SignatureCard } from './SignatureCard';

type TranscriptProps = {
  messages: readonly Message[];
  pendingSignatures: readonly MySignatureRequest[];
  hasOlder: boolean;
  isLoadingOlder: boolean;
  isOpeningDocument: boolean;
  documentError: string | null;
  onLoadOlder: () => void;
  onOpenDocument: (documentId: string) => void;
  onStartSigning: (signatureRequest: MySignatureRequest) => void;
};

export function Transcript({
  messages,
  pendingSignatures,
  hasOlder,
  isLoadingOlder,
  isOpeningDocument,
  documentError,
  onLoadOlder,
  onOpenDocument,
  onStartSigning,
}: TranscriptProps) {
  return (
    <>
      <LoadMore
        hasMore={hasOlder}
        isLoading={isLoadingOlder}
        label="Load earlier messages"
        onPress={onLoadOlder}
      />

      {messages.length === 0 ? (
        <EmptyState
          title="Say hello"
          detail="Ask the Kiaan team anything about your plot, your cycle or your statement."
        />
      ) : (
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}

      {pendingSignatures.map((signatureRequest) => (
        <SignatureCard
          key={signatureRequest.id}
          signatureRequest={signatureRequest}
          isOpening={isOpeningDocument}
          onOpenDocument={onOpenDocument}
          onStartSigning={onStartSigning}
        />
      ))}

      {documentError === null ? null : (
        <Text className="text-sm text-danger" accessibilityRole="alert">
          {documentError}
        </Text>
      )}
    </>
  );
}
