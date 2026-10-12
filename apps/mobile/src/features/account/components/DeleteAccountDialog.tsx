import type { DeletionPolicy } from '@cofarm/contracts/account';
import { Button, Dialog, Input, Spinner } from 'heroui-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

type DeleteAccountDialogProps = {
  isOpen: boolean;
  policy: DeletionPolicy | undefined;
  isDeleting: boolean;
  errorMessage: string | null;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
};

const CONFIRMATION = 'DELETE';

export function DeleteAccountDialog({
  isOpen,
  policy,
  isDeleting,
  errorMessage,
  onOpenChange,
  onDelete,
}: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState('');

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) setTyped('');
        onOpenChange(nextIsOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content isSwipeable={false} className="gap-3">
          <Dialog.Title>Delete your account</Dialog.Title>
          {policy === undefined ? (
            <Spinner />
          ) : (
            <ScrollView className="max-h-40" contentContainerClassName="gap-3">
              <Dialog.Description>{policy.summary}</Dialog.Description>

              <Text className="text-xs font-bold tracking-wider text-muted uppercase">Deleted</Text>
              {policy.cleared.map((cleared) => (
                <Text key={cleared} className="text-sm text-foreground">
                  {cleared}
                </Text>
              ))}

              <Text className="text-xs font-bold tracking-wider text-muted uppercase">Kept</Text>
              {policy.retained.map((retained) => (
                <View key={retained.record} className="gap-0.5">
                  <Text className="text-sm font-bold text-foreground">{retained.record}</Text>
                  <Text className="text-sm text-muted">{retained.reason}</Text>
                </View>
              ))}

              <Text className="text-sm text-danger">{policy.reRegistration}</Text>
              <Text className="text-sm text-muted">{policy.note}</Text>
            </ScrollView>
          )}
          <View className="gap-2">
            <Text className="text-xs font-bold tracking-wider text-muted uppercase">
              {`Type ${CONFIRMATION} to confirm`}
            </Text>
            <Input
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRMATION}
            />
          </View>
          {errorMessage === null ? null : (
            <Text className="text-sm text-danger" accessibilityRole="alert">
              {errorMessage}
            </Text>
          )}
          <View className="gap-2">
            <Button
              variant="danger"
              isDisabled={typed.trim() !== CONFIRMATION || isDeleting}
              onPress={onDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete my account'}
            </Button>
            <Button
              variant="tertiary"
              isDisabled={isDeleting}
              onPress={() => {
                onOpenChange(false);
              }}
            >
              Keep my account
            </Button>
          </View>
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
