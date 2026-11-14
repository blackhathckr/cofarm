import type { MisReport } from '@cofarm/contracts/mis';
import { Button, Dialog, Spinner } from 'heroui-native';
import { Text, View } from 'react-native';

type MisReportDialogProps = {
  report: MisReport | null;
  isOpen: boolean;
  isPending: boolean;
  isOpeningFile: boolean;
  fileError: string | null;
  onOpenFile: (report: MisReport) => void;
  onClose: () => void;
};

export function MisReportDialog({
  report,
  isOpen,
  isPending,
  isOpeningFile,
  fileError,
  onOpenFile,
  onClose,
}: MisReportDialogProps) {
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

              <Text className="text-xs text-muted">
                The report is an Excel workbook. It opens in Excel, Google Sheets or any spreadsheet
                app on your phone.
              </Text>

              {fileError === null ? null : (
                <Text className="text-sm text-danger" accessibilityRole="alert">
                  {fileError}
                </Text>
              )}

              <Button
                isDisabled={isOpeningFile}
                onPress={() => {
                  onOpenFile(report);
                }}
              >
                {isOpeningFile ? 'Opening…' : 'Open report'}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
