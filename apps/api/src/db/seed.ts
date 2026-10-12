import {
  ALL_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from '@cofarm/contracts/permissions';
import { MILESTONE_STAGES } from '@cofarm/core/cycle';
import { newId } from '@cofarm/core/id';
import { rupeesToPaise } from '@cofarm/core/money';

import { env } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { hashPassword } from '../lib/password.ts';
import { closeDatabase, db } from './client.ts';
import {
  cycleMilestones,
  cycles,
  memberships,
  projects,
  rolePermissions,
  roles,
  userRoles,
  users,
} from './schema.ts';

type SeedHolding = {
  code: string;
  contribution: string;
};

type SeedPartner = {
  name: string;
  mobile: string;
  email: string;
  /** More than one when the partner invests in several projects. */
  holdings: readonly SeedHolding[];
};

const SEED_PROJECTS = [
  {
    code: 'MYSBN06',
    name: 'Hunsur Block 6',
    location: 'Hunsur, Mysore',
    acreage: '10.00',
    variety: 'Yelakki + G9 Grand Naine',
    startDate: '2026-02-12',
    cycleStart: '2026-03-01',
    harvestFrom: '2027-02-01',
    harvestTo: '2027-03-31',
    activeStage: 'growth' as const,
  },
  {
    code: 'MYSBN04',
    name: 'Hunsur Block 4',
    location: 'Hunsur, Mysore',
    acreage: '10.00',
    variety: 'G9 Grand Naine',
    startDate: '2025-06-10',
    cycleStart: '2025-07-01',
    harvestFrom: '2026-06-01',
    harvestTo: '2026-07-31',
    activeStage: 'harvest' as const,
  },
  {
    code: 'MYSBN07',
    name: 'Periyapatna Block 7',
    location: 'Periyapatna, Mysore',
    acreage: '10.00',
    variety: 'Yelakki',
    startDate: '2026-09-01',
    cycleStart: '2026-09-15',
    harvestFrom: '2027-09-01',
    harvestTo: '2027-10-31',
    activeStage: 'land_prep' as const,
  },
];

const SEED_PARTNERS: SeedPartner[] = [
  {
    name: 'Rajesh Kumar',
    mobile: '+919845022114',
    email: 'rajesh@example.com',
    holdings: [{ code: 'MYSBN06', contribution: '18,00,000' }],
  },
  {
    name: 'Priya Shetty',
    mobile: '+919845022115',
    email: 'priya@example.com',
    holdings: [{ code: 'MYSBN06', contribution: '12,00,000' }],
  },
  {
    name: 'Venkat Naidu',
    mobile: '+919845022116',
    email: 'venkat@example.com',
    holdings: [{ code: 'MYSBN06', contribution: '9,00,000' }],
  },
  {
    name: 'Amit Mehra',
    mobile: '+919845022117',
    email: 'amit@example.com',
    holdings: [{ code: 'MYSBN04', contribution: '15,00,000' }],
  },
  {
    name: 'Sunita Rao',
    mobile: '+919845022118',
    email: 'sunita@example.com',
    holdings: [{ code: 'MYSBN04', contribution: '11,00,000' }],
  },
  {
    name: 'Kavya Desai',
    mobile: '+919845022119',
    email: 'kavya@example.com',
    holdings: [{ code: 'MYSBN07', contribution: '10,00,000' }],
  },
  {
    name: 'Deepa Iyer',
    mobile: '+919845022120',
    email: 'deepa@example.com',
    holdings: [
      { code: 'MYSBN06', contribution: '7,00,000' },
      { code: 'MYSBN07', contribution: '6,00,000' },
    ],
  },
];

async function seedRoles(): Promise<Map<string, string>> {
  const roleIds = new Map<string, string>();

  for (const key of Object.values(SYSTEM_ROLES)) {
    const id = newId();
    roleIds.set(key, id);
    await db
      .insert(roles)
      .values({ id, key, name: key.charAt(0).toUpperCase() + key.slice(1), isSystem: true });

    const granted =
      key === SYSTEM_ROLES.superadmin ? ALL_PERMISSIONS : (SYSTEM_ROLE_PERMISSIONS[key] ?? []);
    if (granted.length > 0) {
      await db
        .insert(rolePermissions)
        .values(granted.map((permission) => ({ roleId: id, permission })));
    }
  }

  return roleIds;
}

function milestoneStatusAt(index: number, activeIndex: number): 'done' | 'active' | 'upcoming' {
  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'upcoming';
}

async function seedProjects(): Promise<Map<string, string>> {
  const projectIds = new Map<string, string>();

  for (const project of SEED_PROJECTS) {
    const projectId = newId();
    projectIds.set(project.code, projectId);

    await db.insert(projects).values({
      id: projectId,
      code: project.code,
      name: project.name,
      location: project.location,
      acreageAcres: project.acreage,
      variety: project.variety,
      startDate: project.startDate,
      status: 'active',
      capacityPaise: rupeesToPaise('40,00,000'),
      kiaanShareBps: 5000,
    });

    const cycleId = newId();
    await db.insert(cycles).values({
      id: cycleId,
      projectId,
      cycleNo: 1,
      startDate: project.cycleStart,
      expectedHarvestFrom: project.harvestFrom,
      expectedHarvestTo: project.harvestTo,
      status: 'active',
    });

    const activeIndex = MILESTONE_STAGES.indexOf(project.activeStage);
    await db.insert(cycleMilestones).values(
      MILESTONE_STAGES.map((stage, index) => ({
        id: newId(),
        projectId,
        cycleId,
        stage,
        status: milestoneStatusAt(index, activeIndex),
        sortOrder: index,
      })),
    );
  }

  return projectIds;
}

async function seedAdmin(roleIds: Map<string, string>): Promise<void> {
  const adminId = newId();
  await db.insert(users).values({
    id: adminId,
    kind: 'admin',
    name: 'CoFarm Superadmin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
  });

  const superadminRoleId = roleIds.get(SYSTEM_ROLES.superadmin);
  if (superadminRoleId === undefined) throw new Error('Superadmin role was not seeded');
  await db.insert(userRoles).values({ userId: adminId, roleId: superadminRoleId });
}

async function seedPartners(
  projectIds: Map<string, string>,
  roleIds: Map<string, string>,
): Promise<void> {
  const partnerRoleId = roleIds.get(SYSTEM_ROLES.partner);
  if (partnerRoleId === undefined) throw new Error('Partner role was not seeded');

  for (const partner of SEED_PARTNERS) {
    const userId = newId();
    await db.insert(users).values({
      id: userId,
      kind: 'partner',
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
    });
    await db.insert(userRoles).values({ userId, roleId: partnerRoleId });

    for (const holding of partner.holdings) {
      const projectId = projectIds.get(holding.code);
      if (projectId === undefined) throw new Error(`No seeded project for ${holding.code}`);

      await db.insert(memberships).values({
        id: newId(),
        projectId,
        userId,
        contributionPaise: rupeesToPaise(holding.contribution),
        shareBasis: 'pro_rata_contribution',
        agreementStatus: 'signed',
        joinedAt: '2026-02-20',
        status: 'active',
      });
    }
  }
}

try {
  const roleIds = await seedRoles();
  const projectIds = await seedProjects();
  await seedAdmin(roleIds);
  await seedPartners(projectIds, roleIds);

  logger.info(
    {
      admin: env.SEED_ADMIN_EMAIL,
      projects: SEED_PROJECTS.map((project) => project.code),
      partners: SEED_PARTNERS.length,
    },
    'seed complete',
  );
} catch (error) {
  logger.error({ err: error }, 'seed failed');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
