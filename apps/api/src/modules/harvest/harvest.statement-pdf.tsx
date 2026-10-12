import type { PartnerStatement } from '@cofarm/contracts/harvest';
import { fromPaiseString } from '@cofarm/contracts/primitives';
import { formatInr } from '@cofarm/core/money';
import { COST_HEAD_LABELS, COST_HEADS } from '@cofarm/core/pnl';
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

const styles = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, color: '#1f2421' },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d8ded8',
    paddingBottom: 12,
  },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#5b665d' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, marginBottom: 6, color: '#3c6b4f' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowRuled: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: '#d8ded8',
    marginTop: 3,
  },
  label: { color: '#5b665d' },
  value: { textAlign: 'right' },
  strong: { fontSize: 12 },
  callout: { backgroundColor: '#f1f6f1', padding: 12, borderRadius: 4 },
  footer: { marginTop: 24, fontSize: 8, color: '#8a948b' },
});

type StatementRowProps = {
  label: string;
  value: string;
  ruled?: boolean;
  strong?: boolean;
};

function StatementRow({ label, value, ruled, strong }: StatementRowProps): ReactElement {
  return (
    <View style={ruled === true ? styles.rowRuled : styles.row}>
      <Text style={strong === true ? styles.strong : styles.label}>{label}</Text>
      <Text style={strong === true ? [styles.value, styles.strong] : styles.value}>{value}</Text>
    </View>
  );
}

type StatementDocumentProps = {
  statement: PartnerStatement;
};

export function StatementDocument({ statement }: StatementDocumentProps): ReactElement {
  const money = (paise: string): string => formatInr(fromPaiseString(paise));
  const varieties = Object.entries(statement.varietySplit);

  return (
    <Document
      title={`${statement.projectCode} cycle ${statement.cycleNo} statement`}
      author="Kiaan Agro"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Partner statement</Text>
          <Text style={styles.subtitle}>
            {statement.projectName} ({statement.projectCode}) — cycle {statement.cycleNo}
          </Text>
          <Text style={styles.subtitle}>
            {statement.partnerName} — harvested {statement.harvestedOn}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Harvest</Text>
          <StatementRow label="Yield" value={`${statement.yieldKg} kg`} />
          <StatementRow label="Buyer" value={statement.buyer} />
          <StatementRow
            label="Realised price"
            value={`${money(statement.pricePerKgPaise)} per kg`}
          />
          {varieties.map(([variety, kilograms]) => (
            <StatementRow key={variety} label={variety} value={`${kilograms} kg`} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costs</Text>
          {COST_HEADS.map((head) => (
            <StatementRow
              key={head}
              label={COST_HEAD_LABELS[head]}
              value={money(statement.costsByHead[head] ?? '0')}
            />
          ))}
          <StatementRow label="Total costs" value={money(statement.totalCostPaise)} ruled />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profit and loss</Text>
          <StatementRow label="Gross revenue" value={money(statement.grossRevenuePaise)} />
          <StatementRow label="Total costs" value={`- ${money(statement.totalCostPaise)}`} />
          <StatementRow label="Net proceeds" value={money(statement.netProceedsPaise)} ruled />
          <StatementRow
            label={`Kiaan share (${statement.kiaanShareBps / 100}%)`}
            value={money(statement.kiaanSharePaise)}
          />
          <StatementRow label="Partner pool" value={money(statement.partnerPoolPaise)} ruled />
        </View>

        <View style={[styles.section, styles.callout]}>
          <Text style={styles.sectionTitle}>Your share</Text>
          <StatementRow label="Your contribution" value={money(statement.contributionPaise)} />
          <StatementRow label="This cycle" value={money(statement.sharePaise)} strong />
          <StatementRow
            label="Cumulative to date"
            value={money(statement.cumulativeSharePaise)}
            ruled
          />
          <StatementRow label="Return on contribution" value={`${statement.returnBps / 100}%`} />
        </View>

        <Text style={styles.footer}>
          Your share is your contribution as a proportion of the partner pool. Figures are a
          snapshot taken when cycle {statement.cycleNo} was published on{' '}
          {statement.generatedAt.slice(0, 10)}.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderStatementPdf(statement: PartnerStatement): Promise<Buffer> {
  return renderToBuffer(<StatementDocument statement={statement} />);
}

export function statementPdfFilename(statement: PartnerStatement): string {
  return `statement-${statement.projectCode}-cycle-${statement.cycleNo}.pdf`;
}
