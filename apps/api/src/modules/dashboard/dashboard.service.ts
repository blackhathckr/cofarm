import type {
  AdminDashboard,
  DashboardTask,
  PartnerDashboard,
  PartnerProjectCard,
  TaskUrgency,
} from '@cofarm/contracts/dashboard';
import { misPeriodLabel, type MisLatest } from '@cofarm/contracts/mis';
import type { PartnerMembership } from '@cofarm/contracts/partners';
import type { Cycle, ProjectSummary } from '@cofarm/contracts/projects';
import { activeStage, MILESTONE_LABELS } from '@cofarm/core/cycle';

import type { ProjectScope } from '../../lib/project-scope.ts';
import * as mis from '../mis/mis.service.ts';
import * as notifications from '../notifications/notifications.service.ts';
import * as partners from '../partners/partners.service.ts';
import * as harvest from '../harvest/harvest.service.ts';
import * as signatures from '../signatures/signatures.service.ts';
import * as projects from '../projects/projects.service.ts';

const PAGE_LIMIT = 100;
const MAX_PAGES = 25;
const MIS_PERIOD_LOOKBACK = 12;
const NOTIFICATION_SCAN_LIMIT = 100;
const UNSIGNED_NAMES_SHOWN = 3;

/** The MIS for a month is expected in the first week of the month after it. */
const MIS_DUE_DAY = 7;

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const URGENCY_ORDER: Readonly<Record<TaskUrgency, number>> = {
  due: 0,
  upcoming: 1,
  reminder: 2,
};

type Period = {
  year: number;
  month: number;
};

export async function adminDashboard(
  scope: ProjectScope,
  actorUserId: string,
): Promise<AdminDashboard> {
  const viewer: mis.MisViewer = {
    userId: actorUserId,
    scope,
    canSeeDrafts: true,
    isPartner: false,
  };

  const [activeProjects, totals, activePartners, latestReports, harvestDrafts] = await Promise.all([
    collectActiveProjects(scope),
    projects.activeTotals(scope),
    partners.countActiveInScope(scope),
    mis.latestForMember(viewer),
    harvest.listDrafts(scope),
  ]);

  const latestByProject = new Map(latestReports.map((report) => [report.projectId, report]));
  const period = previousPeriod(new Date());

  const perProject = await Promise.all(
    activeProjects.map((project) =>
      tasksForProject(viewer, project, latestByProject.get(project.id) ?? null, period),
    ),
  );
  const draftTasks: DashboardTask[] = harvestDrafts.map((draft) => ({
    projectId: draft.projectId,
    projectCode: draft.projectCode,
    kind: 'harvest_draft',
    title: draft.label,
    detail: 'Partners see nothing until it is published.',
    urgency: 'due',
    dueLabel: 'Awaiting publish',
  }));

  const tasks = [...perProject.flat(), ...draftTasks].sort(byUrgency);

  return {
    counts: {
      activePartners,
      activeProjects: totals.projectCount,
      totalAcreageAcres: totals.totalAcreageAcres,
      pendingActions: tasks.length,
    },
    tasks,
    unavailableTaskKinds: [],
  };
}

export async function partnerDashboard(
  scope: ProjectScope,
  actorUserId: string,
): Promise<PartnerDashboard> {
  const [partner, inbox, pendingActions] = await Promise.all([
    partners.getPartner(scope, actorUserId),
    notifications.listNotifications(actorUserId, { limit: NOTIFICATION_SCAN_LIMIT }),
    pendingSignatureCount(actorUserId),
  ]);

  const unread = inbox.items.filter((notification) => notification.readAt === null);
  const unreadByProject = new Map<string, number>();
  for (const notification of unread) {
    if (notification.projectId === null) continue;
    unreadByProject.set(
      notification.projectId,
      (unreadByProject.get(notification.projectId) ?? 0) + 1,
    );
  }

  const active = partner.memberships.filter((membership) => membership.status === 'active');
  const cards = await Promise.all(
    active.map((membership) =>
      toProjectCard(scope, membership, unreadByProject.get(membership.projectId) ?? 0),
    ),
  );

  return {
    projects: cards,
    banner: unread[0] ?? null,
    unreadNotifications: inbox.unreadCount,
    pendingActions,
  };
}

async function toProjectCard(
  scope: ProjectScope,
  membership: PartnerMembership,
  unreadNotifications: number,
): Promise<PartnerProjectCard> {
  const project = await projects.getProject(scope, membership.projectId);

  return {
    projectId: membership.projectId,
    projectCode: membership.projectCode,
    projectName: membership.projectName,
    variety: project.variety,
    contributionPaise: membership.contributionPaise,
    joinedAt: membership.joinedAt,
    cycle: toPartnerCycle(project.currentCycle),
    unreadNotifications,
  };
}

function toPartnerCycle(cycle: Cycle | null): PartnerProjectCard['cycle'] {
  if (cycle === null) return null;

  const stage = activeStage(
    cycle.milestones.map((milestone) => ({ stage: milestone.stage, status: milestone.status })),
  );

  return {
    id: cycle.id,
    cycleNo: cycle.cycleNo,
    progressBps: cycle.progressBps,
    activeStage: stage,
    activeStageLabel: stage === null ? null : MILESTONE_LABELS[stage],
    expectedHarvestFrom: cycle.expectedHarvestFrom,
    expectedHarvestTo: cycle.expectedHarvestTo,
  };
}

async function tasksForProject(
  viewer: mis.MisViewer,
  project: ProjectSummary,
  latest: MisLatest | null,
  period: Period,
): Promise<DashboardTask[]> {
  const [archive, projectPartners] = await Promise.all([
    mis.listReports(viewer, project.id, { limit: MIS_PERIOD_LOOKBACK }),
    partners.listProjectPartners(viewer.scope, project.id),
  ]);

  const tasks: DashboardTask[] = [];
  const header = { projectId: project.id, projectCode: project.code };
  const label = misPeriodLabel(period.month, period.year);
  const deadline = misDeadline(period);
  const forPeriod =
    archive.items.find((report) => report.year === period.year && report.month === period.month) ??
    null;

  if (forPeriod === null) {
    tasks.push({
      ...header,
      kind: 'mis_missing',
      title: `MIS for ${label} is not written`,
      detail: `${project.name} has no report for the period.`,
      urgency: deadline.urgency,
      dueLabel: deadline.dueLabel,
    });
  } else if (forPeriod.status !== 'published') {
    tasks.push({
      ...header,
      kind: 'mis_unpublished',
      title: `MIS for ${label} is still a draft`,
      detail: forPeriod.title,
      urgency: deadline.urgency,
      dueLabel: deadline.dueLabel,
    });
  }

  const unsigned = projectPartners.filter(
    (member) => member.status === 'active' && member.agreementStatus !== 'signed',
  );
  if (unsigned.length > 0) {
    tasks.push({
      ...header,
      kind: 'unsigned_agreements',
      title: `${unsigned.length.toString()} agreement(s) unsigned at ${project.code}`,
      detail: nameList(unsigned.map((member) => member.name)),
      urgency: 'due',
      dueLabel: 'Awaiting signature',
    });
  }

  if (latest !== null) {
    const receipts = await mis.receiptsForReport(viewer.scope, project.id, latest.id);
    const unopened = receipts.totalCount - receipts.readCount;
    if (unopened > 0) {
      tasks.push({
        ...header,
        kind: 'mis_unread',
        title: `${unopened.toString()} partner(s) have not opened ${latest.label}`,
        detail: `${receipts.readCount.toString()} of ${receipts.totalCount.toString()} have opened it.`,
        urgency: 'reminder',
        dueLabel:
          latest.publishedAt === null ? 'Published' : `Published ${shortDate(latest.publishedAt)}`,
      });
    }
  }

  return tasks;
}

function pendingSignatureCount(userId: string): Promise<number> {
  return signatures.countPendingForUser(userId);
}

async function collectActiveProjects(scope: ProjectScope): Promise<ProjectSummary[]> {
  const collected: ProjectSummary[] = [];
  let cursor: string | undefined;

  for (let attempt = 0; attempt < MAX_PAGES; attempt += 1) {
    const page = await projects.listProjects(scope, {
      limit: PAGE_LIMIT,
      status: 'active',
      ...(cursor === undefined ? {} : { cursor }),
    });
    collected.push(...page.items);
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  return collected;
}

/** Zero-based `getUTCMonth` already reads as the previous month's number. */
function previousPeriod(today: Date): Period {
  const month = today.getUTCMonth();
  if (month === 0) return { year: today.getUTCFullYear() - 1, month: 12 };
  return { year: today.getUTCFullYear(), month };
}

function misDeadline(period: Period): { urgency: TaskUrgency; dueLabel: string } {
  const rolls = period.month === 12;
  const dueYear = rolls ? period.year + 1 : period.year;
  const dueMonth = rolls ? 1 : period.month + 1;
  const dueAt = Date.UTC(dueYear, dueMonth - 1, MIS_DUE_DAY);
  const label = `${MIS_DUE_DAY.toString()} ${shortMonth(dueMonth)}`;

  if (Date.now() > dueAt) return { urgency: 'due', dueLabel: `Overdue since ${label}` };
  return { urgency: 'upcoming', dueLabel: `Due ${label}` };
}

function byUrgency(left: DashboardTask, right: DashboardTask): number {
  return URGENCY_ORDER[left.urgency] - URGENCY_ORDER[right.urgency];
}

function nameList(names: readonly string[]): string {
  const shown = names.slice(0, UNSIGNED_NAMES_SHOWN).join(', ');
  const rest = names.length - UNSIGNED_NAMES_SHOWN;
  return rest > 0 ? `${shown} and ${rest.toString()} more` : shown;
}

function shortMonth(month: number): string {
  return SHORT_MONTHS[month - 1] ?? month.toString();
}

function shortDate(timestamp: string): string {
  const at = new Date(timestamp);
  return `${at.getUTCDate().toString()} ${shortMonth(at.getUTCMonth() + 1)}`;
}
