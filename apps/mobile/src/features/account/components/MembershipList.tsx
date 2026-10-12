import type { AccountMembership } from '@cofarm/contracts/account';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { SectionHeader } from '@/components/ui/SectionHeader';

type MembershipListProps = {
  memberships: readonly AccountMembership[];
};

export function MembershipList({ memberships }: MembershipListProps) {
  return (
    <View className="gap-3">
      <SectionHeader title="Your projects" />

      {memberships.length === 0 ? (
        <EmptyState
          title="No project mapped yet"
          detail="The Kiaan team will map your project to this number shortly."
        />
      ) : (
        <View className="gap-3 rounded-3xl bg-surface p-4">
          {memberships.map((membership) => (
            <View key={membership.projectId} className="gap-1 border-b border-separator pb-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-base font-bold text-foreground">
                  {membership.projectCode}
                </Text>
                <MoneyText
                  paise={membership.contributionPaise}
                  className="text-base font-extrabold text-foreground"
                />
              </View>
              <Text className="text-sm text-muted">{membership.projectName}</Text>
              <Text className="text-xs text-muted">{`Joined ${membership.joinedAt}`}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
