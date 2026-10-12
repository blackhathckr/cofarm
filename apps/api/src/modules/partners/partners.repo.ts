import { and, asc, eq, gt, ilike, inArray, isNull, or, sql, sum, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { memberships, projects, roles, userRoles, users } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export type PartnerRow = typeof users.$inferSelect;

/**
 * Partners are counted once even when mapped to several projects in reach, so
 * the dashboard figure is people rather than memberships.
 */
export async function countActiveInScope(scope: ProjectScope): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(distinct ${users.id})::int` })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(
      and(
        eq(users.kind, 'partner'),
        eq(users.status, 'active'),
        eq(memberships.status, 'active'),
        withinScope(scope, memberships.projectId),
      ),
    );
  return row?.total ?? 0;
}
export type MembershipRow = typeof memberships.$inferSelect;

export type ListFilters = {
  search: string | undefined;
  projectId: string | undefined;
  status: PartnerRow['status'] | undefined;
  limit: number;
  cursor: string | undefined;
};

export type PartnerListRow = {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  status: PartnerRow['status'];
  totalContributionPaise: string | null;
  projectCodes: string[];
  activeMemberships: number;
  pendingAgreements: number;
};

export type PartnerMembershipRow = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  contributionPaise: bigint;
  shareBasis: MembershipRow['shareBasis'];
  sharePctBps: number | null;
  agreementStatus: MembershipRow['agreementStatus'];
  agreementSignedAt: Date | null;
  status: MembershipRow['status'];
  joinedAt: string;
  exitedAt: string | null;
};

export type ProjectPartnerRow = {
  membershipId: string;
  partnerId: string;
  name: string;
  mobile: string | null;
  contributionPaise: bigint;
  shareBasis: MembershipRow['shareBasis'];
  sharePctBps: number | null;
  agreementStatus: MembershipRow['agreementStatus'];
  status: MembershipRow['status'];
  joinedAt: string;
};

const membershipDetailColumns = {
  id: memberships.id,
  projectId: memberships.projectId,
  projectCode: projects.code,
  projectName: projects.name,
  contributionPaise: memberships.contributionPaise,
  shareBasis: memberships.shareBasis,
  sharePctBps: memberships.sharePctBps,
  agreementStatus: memberships.agreementStatus,
  agreementSignedAt: memberships.agreementSignedAt,
  status: memberships.status,
  joinedAt: memberships.joinedAt,
  exitedAt: memberships.exitedAt,
};

/** Totals aggregate only memberships inside the scope, so an out-of-reach
 * project contributes nothing instead of hiding the partner entirely. */
export async function listPartners(
  scope: ProjectScope,
  filters: ListFilters,
): Promise<PartnerListRow[]> {
  const conditions: SQL[] = [eq(users.kind, 'partner'), isNull(users.deletedAt)];

  if (filters.status !== undefined) {
    conditions.push(eq(users.status, filters.status));
  }
  if (filters.projectId !== undefined) {
    conditions.push(
      inArray(
        users.id,
        db
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(
            and(
              eq(memberships.projectId, filters.projectId),
              eq(memberships.status, 'active'),
              withinScope(scope, memberships.projectId),
            ),
          ),
      ),
    );
  }
  if (filters.search !== undefined && filters.search.length > 0) {
    const term = `%${filters.search}%`;
    const byProjectCode = inArray(
      users.id,
      db
        .select({ userId: memberships.userId })
        .from(memberships)
        .innerJoin(projects, eq(projects.id, memberships.projectId))
        .where(and(ilike(projects.code, term), withinScope(scope, memberships.projectId))),
    );
    const match = or(
      ilike(users.name, term),
      ilike(users.mobile, term),
      ilike(users.email, term),
      byProjectCode,
    );
    if (match !== undefined) conditions.push(match);
  }
  if (filters.cursor !== undefined) {
    conditions.push(gt(users.id, filters.cursor));
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      mobile: users.mobile,
      email: users.email,
      status: users.status,
      totalContributionPaise: sum(memberships.contributionPaise),
      projectCodes: sql<string[]>`array_remove(array_agg(distinct ${projects.code}), null)`,
      activeMemberships: sql<number>`count(${memberships.id})::int`,
      pendingAgreements: sql<number>`(count(${memberships.id}) filter (where ${memberships.agreementStatus} <> 'signed'))::int`,
    })
    .from(users)
    .leftJoin(
      memberships,
      and(
        eq(memberships.userId, users.id),
        eq(memberships.status, 'active'),
        withinScope(scope, memberships.projectId),
      ),
    )
    .leftJoin(projects, eq(projects.id, memberships.projectId))
    .where(and(...conditions))
    .groupBy(users.id)
    .orderBy(asc(users.id))
    .limit(filters.limit);
}

export async function findPartner(partnerId: string): Promise<PartnerRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, partnerId), eq(users.kind, 'partner'), isNull(users.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** The mobile uniqueness index spans every user, so admins are checked too. */
export async function findUserByMobile(mobile: string): Promise<PartnerRow | null> {
  const [row] = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
  return row ?? null;
}

export async function insertPartner(row: typeof users.$inferInsert): Promise<PartnerRow> {
  const [created] = await db.insert(users).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no user row');
  return created;
}

export async function updatePartner(
  partnerId: string,
  patch: Partial<typeof users.$inferInsert>,
): Promise<PartnerRow | null> {
  const [updated] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(users.id, partnerId), eq(users.kind, 'partner')))
    .returning();
  return updated ?? null;
}

export async function findRoleIdByKey(key: string): Promise<string | null> {
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key)).limit(1);
  return row?.id ?? null;
}

export async function assignRole(userId: string, roleId: string): Promise<void> {
  await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
}

export async function roleKeysForPartner(partnerId: string): Promise<string[]> {
  const rows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, partnerId))
    .orderBy(asc(roles.key));
  return rows.map((row) => row.key);
}

export async function membershipsForPartner(
  scope: ProjectScope,
  partnerId: string,
): Promise<PartnerMembershipRow[]> {
  return db
    .select(membershipDetailColumns)
    .from(memberships)
    .innerJoin(projects, eq(projects.id, memberships.projectId))
    .where(and(eq(memberships.userId, partnerId), withinScope(scope, memberships.projectId)))
    .orderBy(asc(projects.code));
}

export async function partnersForProject(
  scope: ProjectScope,
  projectId: string,
): Promise<ProjectPartnerRow[]> {
  return db
    .select({
      membershipId: memberships.id,
      partnerId: users.id,
      name: users.name,
      mobile: users.mobile,
      contributionPaise: memberships.contributionPaise,
      shareBasis: memberships.shareBasis,
      sharePctBps: memberships.sharePctBps,
      agreementStatus: memberships.agreementStatus,
      status: memberships.status,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.projectId, projectId), withinScope(scope, memberships.projectId)))
    .orderBy(asc(users.name));
}

export async function findMembership(
  scope: ProjectScope,
  membershipId: string,
): Promise<MembershipRow | null> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), withinScope(scope, memberships.projectId)))
    .limit(1);
  return row ?? null;
}

export async function findMembershipDetail(
  scope: ProjectScope,
  membershipId: string,
): Promise<PartnerMembershipRow | null> {
  const [row] = await db
    .select(membershipDetailColumns)
    .from(memberships)
    .innerJoin(projects, eq(projects.id, memberships.projectId))
    .where(and(eq(memberships.id, membershipId), withinScope(scope, memberships.projectId)))
    .limit(1);
  return row ?? null;
}

export async function findMembershipForPartnerProject(
  scope: ProjectScope,
  partnerId: string,
  projectId: string,
): Promise<MembershipRow | null> {
  const [row] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, partnerId),
        eq(memberships.projectId, projectId),
        withinScope(scope, memberships.projectId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findProjectHeader(
  scope: ProjectScope,
  projectId: string,
): Promise<{ id: string; code: string } | null> {
  const [row] = await db
    .select({ id: projects.id, code: projects.code })
    .from(projects)
    .where(and(eq(projects.id, projectId), withinScope(scope, projects.id)))
    .limit(1);
  return row ?? null;
}

export async function insertMembership(
  row: typeof memberships.$inferInsert,
): Promise<MembershipRow> {
  const [created] = await db.insert(memberships).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no membership row');
  return created;
}

export async function updateMembership(
  membershipId: string,
  patch: Partial<typeof memberships.$inferInsert>,
): Promise<MembershipRow | null> {
  const [updated] = await db
    .update(memberships)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(memberships.id, membershipId))
    .returning();
  return updated ?? null;
}
