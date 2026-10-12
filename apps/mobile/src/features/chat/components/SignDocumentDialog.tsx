import type { MySignatureRequest } from '@cofarm/contracts/signatures';
import { Button, Checkbox, Dialog, Input } from 'heroui-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type SignDocumentDialogProps = {
  signatureRequest: MySignatureRequest | null;
  isSigning: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSign: (signedName: string) => void;
};

export function SignDocumentDialog({
  signatureRequest,
  isSigning,
  errorMessage,
  onClose,
  onSign,
}: SignDocumentDialogProps) {
  const [signedName, setSignedName] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const typedName = signedName.trim();

  return (
    <Dialog
      isOpen={signatureRequest !== null}
      onOpenChange={(isOpen) => {
        if (isOpen) return;
        setSignedName('');
        setHasAgreed(false);
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content isSwipeable={false} className="gap-4">
          <Dialog.Title>Sign this document</Dialog.Title>
          <Dialog.Description>
            {signatureRequest === null
              ? ''
              : `${signatureRequest.documentName}. Type your full name as your signature, then confirm that you agree to it.`}
          </Dialog.Description>
          <View className="gap-2">
            <Text className="text-xs font-bold tracking-wider text-muted uppercase">
              Your full name
            </Text>
            <Input
              value={signedName}
              onChangeText={setSignedName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="As it appears on your agreement"
            />
          </View>
          <View className="flex-row items-start gap-3">
            <Checkbox
              isSelected={hasAgreed}
              onSelectedChange={setHasAgreed}
              accessibilityLabel="I agree to this document"
            />
            <Pressable
              className="flex-1"
              accessibilityRole="button"
              onPress={() => {
                setHasAgreed(!hasAgreed);
              }}
            >
              <Text className="text-sm text-foreground">
                I have read this document and I agree to it. I understand this signature is binding.
              </Text>
            </Pressable>
          </View>
          {errorMessage === null ? null : (
            <Text className="text-sm text-danger" accessibilityRole="alert">
              {errorMessage}
            </Text>
          )}
          <View className="gap-2">
            <Button
              isDisabled={typedName.length === 0 || !hasAgreed || isSigning}
              onPress={() => {
                onSign(typedName);
              }}
            >
              {isSigning ? 'Signing…' : 'Sign'}
            </Button>
            <Button variant="tertiary" isDisabled={isSigning} onPress={onClose}>
              Cancel
            </Button>
          </View>
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
