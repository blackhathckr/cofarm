import { Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import type { DocumentGrouping } from '../hooks/use-partner-documents.ts';
import { DocumentRow } from './DocumentRow';

type DocumentGroupProps = {
  group: DocumentGrouping;
  openingDocumentId: string | null;
  onOpen: (documentId: string) => void;
};

export function DocumentGroup({ group, openingDocumentId, onOpen }: DocumentGroupProps) {
  return (
    <View className="gap-2">
      <SectionHeader title={group.title} />

      {group.documents.map((document) => (
        <DocumentRow
          key={document.id}
          document={document}
          isOpening={document.id === openingDocumentId}
          onOpen={onOpen}
        />
      ))}

      {group.hasMore ? (
        <Text className="text-xs text-muted">
          {`Showing the ${String(group.documents.length)} most recent. Ask the Kiaan team for an older one.`}
        </Text>
      ) : null}
    </View>
  );
}
