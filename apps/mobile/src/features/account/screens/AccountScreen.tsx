import { Button, Spinner } from 'heroui-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import { MembershipList } from '../components/MembershipList';
import { ProfileForm } from '../components/ProfileForm';
import { useDeleteAccount } from '../hooks/use-delete-account.ts';
import { useDeletionPolicy } from '../hooks/use-deletion-policy.ts';
import { useProfile, useUpdateProfile } from '../hooks/use-profile.ts';
import { useSignOut } from '../hooks/use-sign-out.ts';

export function AccountScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const [isDeletionAsked, setIsDeletionAsked] = useState(false);
  const policy = useDeletionPolicy(isDeletionAsked);

  if (profile.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (profile.data === undefined) {
    return (
      <View className="flex-1 justify-center bg-background px-5">
        <EmptyState
          title="Could not load your account"
          detail="Check your connection and pull down to try again."
        />
      </View>
    );
  }

  const account = profile.data;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pt-3 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching}
          onRefresh={() => {
            void profile.refetch();
          }}
        />
      }
    >
      <View className="gap-1">
        <Text className="text-3xl font-extrabold text-foreground">{account.name}</Text>
        <Text className="text-sm text-muted">{account.email ?? account.mobile ?? ''}</Text>
      </View>

      <ProfileForm
        profile={account}
        isSaving={updateProfile.isPending}
        isSaved={updateProfile.isSuccess}
        errorMessage={updateProfile.error === null ? null : updateProfile.error.message}
        onSave={updateProfile.mutate}
      />

      <MembershipList memberships={account.memberships} />

      <View className="gap-2">
        <Button
          variant="secondary"
          isDisabled={signOut.isPending}
          onPress={() => {
            signOut.mutate();
          }}
        >
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </Button>

        <Button
          variant="danger-soft"
          onPress={() => {
            setIsDeletionAsked(true);
          }}
        >
          Delete account
        </Button>
        <Text className="text-xs text-muted">
          This can&apos;t be undone. We&apos;ll show you what goes and what stays first.
        </Text>
      </View>

      <DeleteAccountDialog
        isOpen={isDeletionAsked}
        policy={policy.data}
        isDeleting={deleteAccount.isPending}
        errorMessage={deleteAccount.error === null ? null : deleteAccount.error.message}
        onOpenChange={setIsDeletionAsked}
        onDelete={() => {
          deleteAccount.mutate();
        }}
      />
    </ScrollView>
  );
}
