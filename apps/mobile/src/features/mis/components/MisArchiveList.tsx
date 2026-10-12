import type { MisSummary } from '@cofarm/contracts/mis';
import { View } from 'react-native';

import { LoadMore } from '@/components/ui/LoadMore';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MisArchiveRow } from './MisArchiveRow';

type MisArchiveListProps = {
  reports: readonly MisSummary[];
  openingReportId: string | null;
  onOpen: (reportId: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function MisArchiveList({
  reports,
  openingReportId,
  onOpen,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: MisArchiveListProps) {
  return (
    <View className="gap-3">
      <SectionHeader title="Earlier reports" />

      {reports.map((report) => (
        <MisArchiveRow
          key={report.id}
          report={report}
          isOpening={report.id === openingReportId}
          onPress={() => {
            onOpen(report.id);
          }}
        />
      ))}

      <LoadMore
        hasMore={hasMore}
        isLoading={isLoadingMore}
        label="Show earlier reports"
        onPress={onLoadMore}
      />
    </View>
  );
}
