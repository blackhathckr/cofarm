import type { CostHead } from '@cofarm/core/pnl';
import { newId } from '@cofarm/core/id';

import { db } from './client.ts';
import { expenseHeads } from './schema.ts';

type StarterHead = {
  costHead: CostHead;
  name: string;
  subHeads?: readonly string[];
};

/** The heads of the client's production cost template, filed under our five. */
const STARTER_HEADS: readonly StarterHead[] = [
  { costHead: 'lease_land', name: 'Lease amount' },
  { costHead: 'saplings_infra', name: 'Saplings' },
  { costHead: 'saplings_infra', name: 'Irrigation' },
  { costHead: 'saplings_infra', name: 'Land preparation' },
  { costHead: 'manure_nutrition', name: 'FYM' },
  { costHead: 'manure_nutrition', name: 'Micro nutrients' },
  { costHead: 'manure_nutrition', name: 'Macro nutrients' },
  { costHead: 'manure_nutrition', name: 'Medicine' },
  { costHead: 'manure_nutrition', name: 'Bio agents' },
  { costHead: 'labour_maintenance', name: 'Permanent labour', subHeads: ['Welfare'] },
  {
    costHead: 'labour_maintenance',
    name: 'Temporary labour',
    subHeads: ['Planting', 'Weeding', 'Irrigation setup', 'Soil application'],
  },
  {
    costHead: 'labour_maintenance',
    name: 'Earthing up',
    subHeads: ['Balaram', 'Rotory', 'Bedding'],
  },
  { costHead: 'labour_maintenance', name: 'Tieing of banana plant', subHeads: ['Labour'] },
  { costHead: 'labour_maintenance', name: 'Bunch cover', subHeads: ['Labour'] },
  {
    costHead: 'labour_maintenance',
    name: 'Electric power accessories',
    subHeads: ['Electric repair', 'Borewell repair'],
  },
  { costHead: 'misc', name: 'Disease management - consultant visits' },
  { costHead: 'misc', name: 'Project supervisor' },
];

/** Fills an empty list; once any head exists the list is the admin's to manage. */
export async function seedExpenseHeads(): Promise<number> {
  const [existing] = await db.select({ id: expenseHeads.id }).from(expenseHeads).limit(1);
  if (existing !== undefined) return 0;

  const rows: (typeof expenseHeads.$inferInsert)[] = [];
  STARTER_HEADS.forEach((head, index) => {
    const id = newId();
    rows.push({ id, costHead: head.costHead, parentId: null, name: head.name, sortOrder: index });
    (head.subHeads ?? []).forEach((name, subIndex) => {
      rows.push({ id: newId(), costHead: head.costHead, parentId: id, name, sortOrder: subIndex });
    });
  });

  await db.insert(expenseHeads).values(rows);
  return rows.length;
}
