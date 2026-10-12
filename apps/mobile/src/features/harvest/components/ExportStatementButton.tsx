import type { PartnerStatement } from '@cofarm/contracts/harvest';
import { Button } from 'heroui-native';
import { Text, View } from 'react-native';

import { useStatementPdf } from '../hooks/use-statement-pdf.ts';

type ExportStatementButtonProps = {
  statement: PartnerStatement;
};

export function ExportStatementButton({ statement }: ExportStatementButtonProps) {
  const pdf = useStatementPdf();

  return (
    <View className="gap-2">
      <Button
        variant="secondary"
        isDisabled={pdf.isPending}
        onPress={() => {
          pdf.mutate({
            projectId: statement.projectId,
            projectCode: statement.projectCode,
            cycleId: statement.cycleId,
            cycleNo: statement.cycleNo,
          });
        }}
      >
        {pdf.isPending ? 'Preparing…' : 'Export as PDF'}
      </Button>

      {pdf.error === null ? null : (
        <Text className="text-sm text-danger" accessibilityRole="alert">
          {pdf.error.message}
        </Text>
      )}
    </View>
  );
}
