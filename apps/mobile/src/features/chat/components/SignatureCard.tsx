import type { MySignatureRequest } from '@cofarm/contracts/signatures';
import { Button, Chip } from 'heroui-native';
import { Text, View } from 'react-native';

type SignatureCardProps = {
  signatureRequest: MySignatureRequest;
  isOpening: boolean;
  onOpenDocument: (documentId: string) => void;
  onStartSigning: (signatureRequest: MySignatureRequest) => void;
};

export function SignatureCard({
  signatureRequest,
  isOpening,
  onOpenDocument,
  onStartSigning,
}: SignatureCardProps) {
  return (
    <View className="gap-3 rounded-3xl border border-clay-300 bg-clay-50 p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-bold tracking-wider text-clay-700 uppercase">
          Awaiting your signature
        </Text>
        <Chip size="sm" variant="secondary">
          {signatureRequest.projectCode}
        </Chip>
      </View>

      <Text className="text-base font-bold text-clay-900">{signatureRequest.documentName}</Text>
      <Text className="text-sm text-clay-800">
        {`Sent on ${signatureRequest.sentAt.slice(0, 10)}. Read it before you sign.`}
      </Text>

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          variant="tertiary"
          isDisabled={isOpening}
          onPress={() => {
            onOpenDocument(signatureRequest.documentId);
          }}
        >
          {isOpening ? 'Opening…' : 'Read document'}
        </Button>
        <Button
          className="flex-1"
          onPress={() => {
            onStartSigning(signatureRequest);
          }}
        >
          Sign
        </Button>
      </View>
    </View>
  );
}
