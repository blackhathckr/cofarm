import type { CostHead } from '@cofarm/core/pnl';

export type DocumentType =
  | 'mis_report'
  | 'agreement'
  | 'statement'
  | 'weighment_slip'
  | 'harvest_photo'
  | 'update_photo'
  | 'partner_document'
  | 'other';

export type MilestoneTag =
  | 'land_prep'
  | 'planting'
  | 'growth'
  | 'irrigation'
  | 'nutrition'
  | 'disease_mgmt'
  | 'bunch_formation'
  | 'harvest'
  | 'general';

export type ContributionPlan = { partner: string; rupees: string; on: string };
export type ExpensePlan = { head: CostHead; rupees: string; on: string; note: string };

export type HarvestPlan = {
  yieldKg: string;
  varietySplit: Readonly<Record<string, string>>;
  pricePerKgRupees: string;
  buyer: string;
  harvestedOn: string;
  paidOutOn: string;
  photos: number;
};

export type MisPlan = {
  month: number;
  year: number;
  title: string;
  narrative: string;
  outlook: string;
  published: boolean;
};

export type UpdatePlan = {
  tag: MilestoneTag;
  title: string;
  description: string;
  on: string;
  published: boolean;
  notify: boolean;
  photos: number;
};

export type ActivityPlan = { title: string; detail: string; on: string };

export type MessagePlan = { fromPartner: boolean; body: string; daysAgo: number };
export type ThreadPlan = { partner: string; subject: string; messages: readonly MessagePlan[] };

export type ProjectPlan = {
  code: string;
  contributions: readonly ContributionPlan[];
  expenses: readonly ExpensePlan[];
  harvest?: HarvestPlan;
  mis: readonly MisPlan[];
  updates: readonly UpdatePlan[];
  activity: readonly ActivityPlan[];
  threads: readonly ThreadPlan[];
  /** Partners whose agreement is on file; the rest are left awaiting signature. */
  signedBy: readonly string[];
  awaitingSignatureFrom: readonly string[];
};

/**
 * Three projects at three stages, so every screen has something to show and the
 * empty states are still reachable: MYSBN04 has run a full cycle to payout,
 * MYSBN06 is mid-cycle with costs accruing and no revenue yet, and MYSBN07 has
 * barely started.
 */
export const DEMO_PLAN: readonly ProjectPlan[] = [
  {
    code: 'MYSBN04',
    contributions: [
      { partner: 'Amit Mehra', rupees: '15,00,000', on: '2025-06-20' },
      { partner: 'Sunita Rao', rupees: '11,00,000', on: '2025-06-25' },
    ],
    expenses: [
      {
        head: 'lease_land',
        rupees: '1,60,000',
        on: '2025-07-04',
        note: 'Lease, first half, 10 acres',
      },
      {
        head: 'saplings_infra',
        rupees: '3,40,000',
        on: '2025-07-10',
        note: 'G9 tissue-culture saplings, 11,000 plants',
      },
      {
        head: 'saplings_infra',
        rupees: '2,20,000',
        on: '2025-08-02',
        note: 'Drip mains, laterals and fertigation tank',
      },
      {
        head: 'manure_nutrition',
        rupees: '1,50,000',
        on: '2025-09-15',
        note: 'Basal dose, FYM 18 tonnes',
      },
      {
        head: 'labour_maintenance',
        rupees: '2,10,000',
        on: '2025-10-06',
        note: 'Weeding, desuckering, first round',
      },
      {
        head: 'misc',
        rupees: '60,000',
        on: '2025-11-21',
        note: 'Farm road gravel and culvert repair',
      },
      {
        head: 'manure_nutrition',
        rupees: '1,40,000',
        on: '2025-12-11',
        note: 'Fertigation, rounds 3 to 6',
      },
      {
        head: 'lease_land',
        rupees: '1,60,000',
        on: '2026-01-08',
        note: 'Lease, second half, 10 acres',
      },
      {
        head: 'labour_maintenance',
        rupees: '2,10,000',
        on: '2026-02-14',
        note: 'Propping and bunch sleeving',
      },
      {
        head: 'manure_nutrition',
        rupees: '1,20,000',
        on: '2026-03-19',
        note: 'Potash schedule, bunch filling',
      },
      { head: 'misc', rupees: '45,000', on: '2026-04-16', note: 'Pest traps and consumables' },
      {
        head: 'labour_maintenance',
        rupees: '2,10,000',
        on: '2026-05-09',
        note: 'Harvest crew advance',
      },
    ],
    harvest: {
      yieldKg: '68400.00',
      varietySplit: { 'G9 Grand Naine': '68400' },
      pricePerKgRupees: '42.50',
      buyer: 'Sresta Natural Bioproducts',
      harvestedOn: '2026-06-28',
      paidOutOn: '2026-07-12',
      photos: 3,
    },
    mis: [
      {
        month: 4,
        year: 2026,
        title: 'April 2026',
        narrative: 'Bunch filling completed across all four blocks. Average bunch weight 24.1 kg.',
        outlook: 'Harvest window holding at the first week of July.',
        published: true,
      },
      {
        month: 5,
        year: 2026,
        title: 'May 2026',
        narrative: 'Pre-harvest grading done. Buyer walkthrough completed on the 22nd.',
        outlook: 'Price indication of 42 to 44 rupees per kg against a 40 rupee budget.',
        published: true,
      },
      {
        month: 6,
        year: 2026,
        title: 'June 2026',
        narrative: 'Harvest closed on the 28th at 68,400 kg against a 64,000 kg projection.',
        outlook: 'Payout released in the second week of July. Cycle 2 planning begins in August.',
        published: true,
      },
    ],
    updates: [
      {
        tag: 'bunch_formation',
        title: 'Bunch sleeving finished on blocks A to D',
        description:
          'All 11,000 plants sleeved ahead of the pre-monsoon showers. Sleeving protects the fruit finish, which is what the buyer grades on.',
        on: '2026-02-16',
        published: true,
        notify: false,
        photos: 2,
      },
      {
        tag: 'harvest',
        title: 'Harvest closed at 68,400 kg',
        description:
          'Cutting ran over nine days with weighment at the farm gate. Final weight came in 6.9 percent above the projection.',
        on: '2026-06-28',
        published: true,
        notify: true,
        photos: 3,
      },
    ],
    activity: [
      {
        title: 'Fertigation, round 7',
        detail: 'Potash and micronutrient mix, 4 hrs.',
        on: '2026-03-20',
      },
      {
        title: 'Buyer walkthrough',
        detail: 'Sresta team graded blocks A and C.',
        on: '2026-05-22',
      },
      { title: 'Weighment, day 9', detail: 'Closing lot 7,240 kg. Slips filed.', on: '2026-06-28' },
    ],
    threads: [
      {
        partner: 'Amit Mehra',
        subject: 'Payout timing',
        messages: [
          {
            fromPartner: true,
            body: 'Harvest looks closed. When does the payout land?',
            daysAgo: 96,
          },
          {
            fromPartner: false,
            body: 'Statements are generated. Transfer goes out on the 12th, and you will see it against your contribution in the app.',
            daysAgo: 95,
          },
          {
            fromPartner: true,
            body: 'Received, thank you. Numbers match the statement.',
            daysAgo: 82,
          },
        ],
      },
    ],
    signedBy: ['Amit Mehra', 'Sunita Rao'],
    awaitingSignatureFrom: [],
  },
  {
    code: 'MYSBN06',
    contributions: [
      { partner: 'Rajesh Kumar', rupees: '18,00,000', on: '2026-02-15' },
      { partner: 'Priya Shetty', rupees: '12,00,000', on: '2026-02-18' },
      { partner: 'Venkat Naidu', rupees: '9,00,000', on: '2026-02-22' },
    ],
    expenses: [
      {
        head: 'lease_land',
        rupees: '2,40,000',
        on: '2026-03-05',
        note: 'Annual lease, 10 acres, Hunsur',
      },
      {
        head: 'saplings_infra',
        rupees: '4,80,000',
        on: '2026-03-12',
        note: 'Yelakki and G9 saplings, 11,200 plants',
      },
      {
        head: 'saplings_infra',
        rupees: '1,95,000',
        on: '2026-03-20',
        note: 'Drip layout and fertigation tank',
      },
      {
        head: 'labour_maintenance',
        rupees: '1,35,000',
        on: '2026-04-02',
        note: 'Planting labour, 9 days',
      },
      {
        head: 'manure_nutrition',
        rupees: '1,15,000',
        on: '2026-04-08',
        note: 'Basal dose, FYM 18 tonnes',
      },
      { head: 'misc', rupees: '42,000', on: '2026-05-19', note: 'Farm road gravel' },
      {
        head: 'manure_nutrition',
        rupees: '95,000',
        on: '2026-06-14',
        note: 'Fertigation, round 2',
      },
      {
        head: 'labour_maintenance',
        rupees: '1,10,000',
        on: '2026-07-05',
        note: 'Weeding and desuckering',
      },
      { head: 'misc', rupees: '36,000', on: '2026-08-05', note: 'Pest-trap consumables' },
      { head: 'manure_nutrition', rupees: '88,000', on: '2026-08-22', note: 'Micronutrient spray' },
      {
        head: 'labour_maintenance',
        rupees: '1,25,000',
        on: '2026-09-10',
        note: 'Propping and bunch care',
      },
    ],
    mis: [
      {
        month: 6,
        year: 2026,
        title: 'June 2026',
        narrative: 'Vegetative growth on track. Plant stand at 98.2 percent after gap filling.',
        outlook: 'Bunch emergence expected from late October.',
        published: true,
      },
      {
        month: 7,
        year: 2026,
        title: 'July 2026',
        narrative: 'Desuckering completed. Two blocks showed sigatoka pressure and were sprayed.',
        outlook: 'No change to the harvest window.',
        published: true,
      },
      {
        month: 8,
        year: 2026,
        title: 'August 2026',
        narrative: 'Girth and height ahead of the reference curve by roughly a week.',
        outlook: 'Bunch emergence running a week ahead of plan.',
        published: true,
      },
      {
        month: 9,
        year: 2026,
        title: 'September 2026',
        narrative: 'Propping underway. Costs to date are 42.6 percent of the cycle budget.',
        outlook: 'Draft, pending the September cost close.',
        published: false,
      },
    ],
    updates: [
      {
        tag: 'land_prep',
        title: 'Land preparation complete',
        description:
          'Deep ploughing, two passes of rotavation and pit marking at 1.8 by 1.8 metres across all 10 acres.',
        on: '2026-03-08',
        published: true,
        notify: false,
        photos: 2,
      },
      {
        tag: 'planting',
        title: '11,200 saplings in the ground',
        description:
          'Planting ran nine days. Yelakki on blocks A and B, G9 on C and D, so the two varieties can be harvested separately.',
        on: '2026-04-02',
        published: true,
        notify: true,
        photos: 3,
      },
      {
        tag: 'irrigation',
        title: 'Drip commissioned',
        description: 'Fertigation tank plumbed and the full 10 acres pressure-tested at 1.2 bar.',
        on: '2026-04-20',
        published: true,
        notify: false,
        photos: 1,
      },
      {
        tag: 'disease_mgmt',
        title: 'Sigatoka spray on blocks C and D',
        description:
          'Early leaf-spot pressure after a wet fortnight. Two rounds of propiconazole seven days apart, with the affected leaves removed and burned.',
        on: '2026-07-18',
        published: true,
        notify: true,
        photos: 2,
      },
      {
        tag: 'growth',
        title: 'Girth and height a week ahead',
        description: 'Pseudostem girth averaging 68 cm at month six against a 64 cm reference.',
        on: '2026-08-24',
        published: true,
        notify: false,
        photos: 1,
      },
      {
        tag: 'general',
        title: 'Propping schedule for October',
        description: 'Draft, pending the contractor quote.',
        on: '2026-09-28',
        published: false,
        notify: false,
        photos: 0,
      },
    ],
    activity: [
      {
        title: 'Irrigation, 11 hrs, blocks A to D',
        detail: 'Drip run after fertigation.',
        on: '2026-09-02',
      },
      {
        title: 'Desuckering, blocks A and B',
        detail: 'Two suckers retained per mat.',
        on: '2026-09-09',
      },
      { title: 'Propping, block A', detail: '640 plants propped with bamboo.', on: '2026-09-11' },
      {
        title: 'Scouting round',
        detail: 'No sigatoka recurrence. Weevil traps clear.',
        on: '2026-09-19',
      },
      { title: 'Fertigation, round 5', detail: 'Potash schedule begins.', on: '2026-09-26' },
    ],
    threads: [
      {
        partner: 'Rajesh Kumar',
        subject: 'Sigatoka on blocks C and D',
        messages: [
          {
            fromPartner: true,
            body: 'Saw the disease update. Is the spray cost inside the budget?',
            daysAgo: 74,
          },
          {
            fromPartner: false,
            body: 'Yes. It sits under manure and nutrition and the head is still 61 percent unspent, so there is no change to your projected share.',
            daysAgo: 74,
          },
          {
            fromPartner: true,
            body: 'Understood. Will the September MIS carry the revised cost line?',
            daysAgo: 73,
          },
          {
            fromPartner: false,
            body: 'It will, once the month closes. The draft is with operations.',
            daysAgo: 72,
          },
        ],
      },
      {
        partner: 'Priya Shetty',
        subject: 'Agreement copy',
        messages: [
          {
            fromPartner: true,
            body: 'Can I get a copy of the signed agreement for my records?',
            daysAgo: 40,
          },
          { fromPartner: false, body: 'It is on your documents tab now.', daysAgo: 39 },
        ],
      },
    ],
    signedBy: ['Rajesh Kumar', 'Priya Shetty', 'Venkat Naidu'],
    awaitingSignatureFrom: [],
  },
  {
    code: 'MYSBN07',
    contributions: [{ partner: 'Kavya Desai', rupees: '10,00,000', on: '2026-09-05' }],
    expenses: [
      {
        head: 'lease_land',
        rupees: '2,40,000',
        on: '2026-09-18',
        note: 'Annual lease, 10 acres, Periyapatna',
      },
      {
        head: 'labour_maintenance',
        rupees: '65,000',
        on: '2026-09-25',
        note: 'Clearing and first ploughing',
      },
    ],
    mis: [],
    updates: [
      {
        tag: 'land_prep',
        title: 'Site cleared, ploughing begun',
        description:
          'Scrub cleared across all 10 acres. First ploughing pass done on the eastern half.',
        on: '2026-09-25',
        published: true,
        notify: false,
        photos: 2,
      },
    ],
    activity: [
      {
        title: 'Soil sampling',
        detail: 'Nine composite samples sent for analysis.',
        on: '2026-09-20',
      },
    ],
    threads: [],
    signedBy: [],
    awaitingSignatureFrom: ['Kavya Desai'],
  },
];
