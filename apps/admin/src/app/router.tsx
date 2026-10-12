import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { RootLayout } from '@/app/root-layout';
import { ProjectTabs } from '@/components/ProjectTabs';
import { UsersPage } from '@/features/admin-users/pages/UsersPage';
import { RolesPage } from '@/features/admin-users/pages/RolesPage';
import { SecurityPage } from '@/features/admin-users/pages/SecurityPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { HarvestEntryPage } from '@/features/harvest/pages/HarvestEntryPage';
import { HarvestPage } from '@/features/harvest/pages/HarvestPage';
import { ContributionsPage } from '@/features/ledger/pages/ContributionsPage';
import { ExpensesPage } from '@/features/ledger/pages/ExpensesPage';
import { InboxPage } from '@/features/messaging/pages/InboxPage';
import { MisPage } from '@/features/mis/pages/MisPage';
import { MisReportPage } from '@/features/mis/pages/MisReportPage';
import { PartnerDetailPage } from '@/features/partners/pages/PartnerDetailPage';
import { PartnersPage } from '@/features/partners/pages/PartnersPage';
import { ProjectDetailPage } from '@/features/projects/pages/ProjectDetailPage';
import { ProjectsPage } from '@/features/projects/pages/ProjectsPage';
import { ApprovalsPage } from '@/features/signatures/pages/ApprovalsPage';
import { UpdateHistoryPage } from '@/features/updates/pages/UpdateHistoryPage';
import { PostUpdatePage } from '@/features/updates/pages/PostUpdatePage';

const rootRoute = createRootRoute({ component: RootLayout });

type ParamRoute = { useParams: () => unknown };

const projectParams = z.object({ projectId: z.string() });
const partnerParams = z.object({ partnerId: z.string() });
const reportParams = projectParams.extend({ reportId: z.string() });
const harvestParams = projectParams.extend({ harvestId: z.string() });

function useRouteParams<TSchema extends z.ZodType>(
  route: ParamRoute,
  schema: TSchema,
): z.infer<TSchema> {
  return schema.parse(route.useParams());
}

function route(path: string, component: () => ReactNode) {
  return createRoute({ getParentRoute: () => rootRoute, path, component });
}

/** Project-scoped screens all sit under the project tab strip. */
function withProjectTabs(projectId: string, children: ReactNode) {
  return (
    <div className="space-y-6">
      <ProjectTabs projectId={projectId} />
      {children}
    </div>
  );
}

const dashboardRoute = route('/', () => <DashboardPage />);
const projectsRoute = route('/projects', () => <ProjectsPage />);
const partnersRoute = route('/partners', () => <PartnersPage />);
const approvalsRoute = route('/approvals', () => <ApprovalsPage />);
export type InboxSearch = { thread?: string; project?: string };

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  validateSearch: (search: Record<string, unknown>): InboxSearch => ({
    ...(typeof search['thread'] === 'string' ? { thread: search['thread'] } : {}),
    ...(typeof search['project'] === 'string' ? { project: search['project'] } : {}),
  }),
  component: () => <InboxPage />,
});
const adminUsersRoute = route('/admin/users', () => <UsersPage />);
const adminRolesRoute = route('/admin/roles', () => <RolesPage />);
const securityRoute = route('/security', () => <SecurityPage />);

const partnerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/partners/$partnerId',
  component: function PartnerDetailRoute() {
    const { partnerId } = useRouteParams(partnerDetailRoute, partnerParams);
    return <PartnerDetailPage partnerId={partnerId} />;
  },
});

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: function ProjectDetailRoute() {
    const { projectId } = useRouteParams(projectDetailRoute, projectParams);
    return withProjectTabs(projectId, <ProjectDetailPage projectId={projectId} />);
  },
});

const updatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/updates',
  component: function UpdatesRoute() {
    const { projectId } = useRouteParams(updatesRoute, projectParams);
    return withProjectTabs(projectId, <UpdateHistoryPage projectId={projectId} />);
  },
});

const postUpdateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/updates/new',
  component: function PostUpdateRoute() {
    const { projectId } = useRouteParams(postUpdateRoute, projectParams);
    return withProjectTabs(projectId, <PostUpdatePage projectId={projectId} />);
  },
});

const misRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/mis',
  component: function MisRoute() {
    const { projectId } = useRouteParams(misRoute, projectParams);
    return withProjectTabs(projectId, <MisPage projectId={projectId} />);
  },
});

const misReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/mis/$reportId',
  component: function MisReportRoute() {
    const { projectId, reportId } = useRouteParams(misReportRoute, reportParams);
    return withProjectTabs(projectId, <MisReportPage projectId={projectId} reportId={reportId} />);
  },
});

const expensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/expenses',
  component: function ExpensesRoute() {
    const { projectId } = useRouteParams(expensesRoute, projectParams);
    return withProjectTabs(projectId, <ExpensesPage projectId={projectId} />);
  },
});

const contributionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/contributions',
  component: function ContributionsRoute() {
    const { projectId } = useRouteParams(contributionsRoute, projectParams);
    return withProjectTabs(projectId, <ContributionsPage projectId={projectId} />);
  },
});

const harvestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/harvest',
  component: function HarvestRoute() {
    const { projectId } = useRouteParams(harvestRoute, projectParams);
    return withProjectTabs(projectId, <HarvestPage projectId={projectId} />);
  },
});

const harvestNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/harvest/new',
  component: function HarvestNewRoute() {
    const { projectId } = useRouteParams(harvestNewRoute, projectParams);
    // harvestId is omitted, not passed as undefined: exactOptionalPropertyTypes.
    return withProjectTabs(projectId, <HarvestEntryPage projectId={projectId} />);
  },
});

const harvestEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/harvest/$harvestId',
  component: function HarvestEditRoute() {
    const { projectId, harvestId } = useRouteParams(harvestEditRoute, harvestParams);
    return withProjectTabs(
      projectId,
      <HarvestEntryPage projectId={projectId} harvestId={harvestId} />,
    );
  },
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    projectDetailRoute,
    updatesRoute,
    postUpdateRoute,
    misRoute,
    misReportRoute,
    expensesRoute,
    contributionsRoute,
    harvestRoute,
    harvestNewRoute,
    harvestEditRoute,
    partnersRoute,
    partnerDetailRoute,
    approvalsRoute,
    inboxRoute,
    adminUsersRoute,
    adminRolesRoute,
    securityRoute,
  ]),
});

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}
