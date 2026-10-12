import { eq } from 'drizzle-orm';

import { db } from '../client.ts';
import { cycles, memberships, projects, users } from '../schema.ts';

export type DemoMembership = {
  membershipId: string;
  userId: string;
  name: string;
  mobile: string;
};

export type DemoProject = {
  projectId: string;
  code: string;
  cycleId: string;
  cycleNo: number;
  members: readonly DemoMembership[];
};

export type DemoContext = {
  adminUserId: string;
  byCode: ReadonlyMap<string, DemoProject>;
};

/**
 * The demo data layers on top of `db:seed` rather than re-inserting its rows,
 * so it reads back the ids the base seed generated.
 */
export async function loadContext(adminEmail: string): Promise<DemoContext> {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);
  if (admin === undefined) {
    throw new Error('No seeded admin found. Run `pnpm db:seed` first.');
  }

  const rows = await db
    .select({
      projectId: projects.id,
      code: projects.code,
      cycleId: cycles.id,
      cycleNo: cycles.cycleNo,
      membershipId: memberships.id,
      userId: users.id,
      name: users.name,
      mobile: users.mobile,
    })
    .from(projects)
    .innerJoin(cycles, eq(cycles.projectId, projects.id))
    .innerJoin(memberships, eq(memberships.projectId, projects.id))
    .innerJoin(users, eq(users.id, memberships.userId));

  const byCode = new Map<string, DemoProject>();
  for (const row of rows) {
    const existing = byCode.get(row.code);
    const member: DemoMembership = {
      membershipId: row.membershipId,
      userId: row.userId,
      name: row.name,
      mobile: row.mobile ?? '',
    };

    if (existing === undefined) {
      byCode.set(row.code, {
        projectId: row.projectId,
        code: row.code,
        cycleId: row.cycleId,
        cycleNo: row.cycleNo,
        members: [member],
      });
      continue;
    }

    byCode.set(row.code, { ...existing, members: [...existing.members, member] });
  }

  if (byCode.size === 0) {
    throw new Error('No seeded projects found. Run `pnpm db:seed` first.');
  }

  return { adminUserId: admin.id, byCode };
}

export function projectOf(context: DemoContext, code: string): DemoProject {
  const project = context.byCode.get(code);
  if (project === undefined) throw new Error(`No seeded project ${code}`);
  return project;
}

export function memberOf(project: DemoProject, name: string): DemoMembership {
  const member = project.members.find((candidate) => candidate.name === name);
  if (member === undefined) throw new Error(`No ${name} on ${project.code}`);
  return member;
}
