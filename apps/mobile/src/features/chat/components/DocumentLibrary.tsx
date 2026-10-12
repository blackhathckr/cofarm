import { Button } from 'heroui-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentDownload } from '@/lib/document-download.ts';
import { usePartnerDocuments } from '../hooks/use-partner-documents.ts';
import { DocumentGroup } from './DocumentGroup';

type DocumentLibraryProps = {
  projectId: string;
};

export function DocumentLibrary({ projectId }: DocumentLibraryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const library = usePartnerDocuments(projectId, isOpen);
  const download = useDocumentDownload();

  const hasDocuments = library.groups.length > 0;

  return (
    <View className="border-b border-border bg-surface">
      <Pressable
        className="flex-row items-center justify-between gap-3 px-5 py-3"
        accessibilityRole="button"
        accessibilityLabel="Your documents"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => {
          setIsOpen(!isOpen);
          download.reset();
        }}
      >
        <View className="flex-1 gap-1">
          <Text className="text-base font-bold text-foreground">Your documents</Text>
          <Text className="text-xs text-muted">
            Agreement, monthly reports, statements and slips
          </Text>
        </View>
        <Text className="text-xs font-bold text-clay-700">{isOpen ? 'Hide' : 'Open'}</Text>
      </Pressable>

      {isOpen ? (
        <ScrollView className="max-h-72 grow-0" contentContainerClassName="gap-4 px-5 pb-4">
          {library.isPending ? <Loading /> : null}

          {library.groups.map((group) => (
            <DocumentGroup
              key={group.type}
              group={group}
              openingDocumentId={download.isPending ? download.variables : null}
              onOpen={download.mutate}
            />
          ))}

          {!library.isPending && !library.isError && !hasDocuments ? (
            <EmptyState
              title="No documents yet"
              detail="Your agreement, reports and statements will appear here as the Kiaan team files them."
            />
          ) : null}

          {library.isError ? (
            <View className="gap-2">
              <Text className="text-sm text-danger" accessibilityRole="alert">
                Your documents could not be loaded just now.
              </Text>
              <Button variant="tertiary" onPress={library.refetch}>
                Try again
              </Button>
            </View>
          ) : null}

          {download.error === null ? null : (
            <Text className="text-sm text-danger" accessibilityRole="alert">
              That document could not be opened. Try again in a moment.
            </Text>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
