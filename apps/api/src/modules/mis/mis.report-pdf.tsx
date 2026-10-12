import type { MisCostHead, MisMilestoneState } from '@cofarm/contracts/mis';
import { MILESTONE_LABELS } from '@cofarm/core/cycle';
import { formatInr } from '@cofarm/core/money';
import { COST_HEAD_LABELS, COST_HEADS } from '@cofarm/core/pnl';
import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

const STAGE_STATUS_LABELS: Readonly<Record<'done' | 'active' | 'upcoming', string>> = {
  done: 'Complete',
  active: 'In progress',
  upcoming: 'Upcoming',
};

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
  paragraph: { lineHeight: 1.5, marginBottom: 6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  photoCell: { width: '33%', paddingHorizontal: 4, paddingBottom: 8 },
  photo: { width: '100%', height: 78, objectFit: 'cover', borderRadius: 3 },
  caption: { fontSize: 7, color: '#8a948b', marginTop: 2 },
  footer: { marginTop: 24, fontSize: 8, color: '#8a948b' },
});

type ReportRowProps = {
  label: string;
  value: string;
  ruled?: boolean;
  strong?: boolean;
};

function ReportRow({ label, value, ruled, strong }: ReportRowProps): ReactElement {
  return (
    <View style={ruled === true ? styles.rowRuled : styles.row}>
      <Text style={strong === true ? styles.strong : styles.label}>{label}</Text>
      <Text style={strong === true ? [styles.value, styles.strong] : styles.value}>{value}</Text>
    </View>
  );
}

export type ReportPhoto = {
  caption: string | null;
  body: Buffer;
  format: 'png' | 'jpg';
};

export type MisReportContent = {
  projectCode: string;
  projectName: string;
  label: string;
  title: string;
  narrative: string;
  outlook: string;
  costsByHead: Readonly<Partial<Record<MisCostHead, bigint>>>;
  totalCostPaise: bigint;
  updateCount: number;
  milestone: MisMilestoneState | null;
  photos: readonly ReportPhoto[];
  generatedOn: string;
};

type MisReportDocumentProps = {
  report: MisReportContent;
};

export function MisReportDocument({ report }: MisReportDocumentProps): ReactElement {
  const milestone = report.milestone;

  return (
    <Document title={`${report.projectCode} ${report.label} MIS report`} author="Kiaan Agro">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.subtitle}>
            {report.projectName} ({report.projectCode}) — {report.label}
          </Text>
          <Text style={styles.subtitle}>Management information report</Text>
        </View>

        <View style={[styles.section, styles.callout]}>
          <Text style={styles.sectionTitle}>The month</Text>
          <Text style={styles.paragraph}>{report.narrative}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costs</Text>
          {COST_HEADS.map((head) => (
            <ReportRow
              key={head}
              label={COST_HEAD_LABELS[head]}
              value={formatInr(report.costsByHead[head] ?? 0n)}
            />
          ))}
          <ReportRow label="Total costs" value={formatInr(report.totalCostPaise)} ruled strong />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field activity</Text>
          <ReportRow label="Updates posted in the period" value={report.updateCount.toString()} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestone progress</Text>
          {milestone === null ? (
            <ReportRow label="Cycle" value="No cycle open" />
          ) : (
            <>
              <ReportRow label={`Cycle ${milestone.cycleNo}`} value="" />
              <ReportRow
                label="Progress"
                value={`${Math.round(milestone.progressBps / 100)}%`}
                strong
              />
              {milestone.stages.map((stage) => (
                <ReportRow
                  key={stage.stage}
                  label={MILESTONE_LABELS[stage.stage]}
                  value={STAGE_STATUS_LABELS[stage.status]}
                />
              ))}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farm photographs</Text>
          {report.photos.length === 0 ? (
            <Text style={styles.label}>No photographs were posted in the period.</Text>
          ) : (
            <View style={styles.photoGrid}>
              {report.photos.map((photo, index) => (
                <View key={index} style={styles.photoCell}>
                  <Image style={styles.photo} src={{ data: photo.body, format: photo.format }} />
                  {photo.caption === null ? null : (
                    <Text style={styles.caption}>{photo.caption}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outlook</Text>
          <Text style={styles.paragraph}>{report.outlook}</Text>
        </View>

        <Text style={styles.footer}>
          Generated from platform records on {report.generatedOn}. Figures are a snapshot taken when
          this report was published.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderMisReportPdf(report: MisReportContent): Promise<Buffer> {
  return renderToBuffer(<MisReportDocument report={report} />);
}

export function misReportPdfFilename(projectCode: string, year: number, month: number): string {
  return `mis-${projectCode}-${year}-${month.toString().padStart(2, '0')}.pdf`;
}
