import type { MisReport } from '@cofarm/contracts/mis';
import { Button, Dialog, Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

type MisReportDialogProps = {
  report: MisReport | null;
  isOpen: boolean;
  isPending: boolean;
  isDownloading: boolean;
  downloadError: string | null;
  onDownload: (documentId: string) => void;
  onClose: () => void;
};

export function MisReportDialog({
  report,
  isOpen,
  isPending,
  isDownloading,
  downloadError,
  onDownload,
  onClose,
}: MisReportDialogProps) {
  const documentId = report?.documentId ?? null;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(isNowOpen) => {
        if (!isNowOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content isSwipeable={false} className="gap-3">
          <Dialog.Close />

          {report === null || isPending ? (
            <View className="items-center justify-center py-10">
              <Spinner />
            </View>
          ) : (
            <>
              <Dialog.Title>{report.label}</Dialog.Title>
              <Dialog.Description>{report.title}</Dialog.Description>

              <ScrollView className="max-h-72" contentContainerClassName="gap-3">
                {report.narrative === null ? null : (
                  <Text className="text-sm leading-relaxed text-foreground">
                    {report.narrative}
                  </Text>
                )}
                {report.outlook === null ? null : (
                  <View className="gap-1">
                    <Text className="text-xs font-bold tracking-wider text-muted uppercase">
                      Outlook
                    </Text>
                    <Text className="text-sm leading-relaxed text-foreground">
                      {report.outlook}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {downloadError === null ? null : (
                <Text className="text-sm text-danger" accessibilityRole="alert">
                  {downloadError}
                </Text>
              )}

              {documentId === null ? (
                <Text className="text-xs text-muted">
                  This report has no file attached. The summary above is the full report.
                </Text>
              ) : (
                <Button
                  isDisabled={isDownloading}
                  onPress={() => {
                    onDownload(documentId);
                  }}
                >
                  {isDownloading ? 'Opening…' : 'Download report'}
                </Button>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
