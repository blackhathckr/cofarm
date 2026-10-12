import type { AccountProfile } from '@cofarm/contracts/account';
import { Button, Input } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';

type ProfileFormProps = {
  profile: AccountProfile;
  isSaving: boolean;
  errorMessage: string | null;
  isSaved: boolean;
  onSave: (edits: { name: string; email: string }) => void;
};

export function ProfileForm({
  profile,
  isSaving,
  errorMessage,
  isSaved,
  onSave,
}: ProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const isUnchanged = name === profile.name && email === (profile.email ?? '');

  function saveLabel(): string {
    if (isSaving) return 'Saving…';
    return isSaved && isUnchanged ? 'Saved' : 'Save changes';
  }

  return (
    <View className="gap-3 rounded-3xl bg-surface p-5">
      <SectionHeader title="Your details" />

      <View className="gap-2">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Name</Text>
        <Input value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Email</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Optional"
        />
      </View>

      <View className="gap-1">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Mobile</Text>
        <Text className="text-base font-bold text-foreground">{profile.mobile ?? '—'}</Text>
        <Text className="text-xs text-muted">
          Your mobile number is how you sign in, so only the Kiaan team can change it. Message them
          to have it updated.
        </Text>
      </View>

      {errorMessage === null ? null : (
        <Text className="text-sm text-danger" accessibilityRole="alert">
          {errorMessage}
        </Text>
      )}

      <Button
        isDisabled={isUnchanged || name.trim().length < 2 || isSaving}
        onPress={() => {
          onSave({ name, email });
        }}
      >
        {saveLabel()}
      </Button>
    </View>
  );
}
