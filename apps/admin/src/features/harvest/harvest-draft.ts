import type { Harvest, VarietySplit } from '@cofarm/contracts/harvest';
import { paiseToRupeeString } from '@cofarm/core/money';

import { indiaToday } from '@/lib/india-date.ts';
import { parseRupeeAmount } from '@/lib/rupee-input.ts';
import { parseKilograms } from './kilogram-input.ts';
import {
  buildVarietySplit,
  newVarietyRow,
  toVarietyRows,
  type VarietyRow,
} from './variety-split.ts';

export type HarvestDraft = {
  cycleId: string;
  yieldKg: string;
  rows: VarietyRow[];
  priceRupees: string;
  buyer: string;
  harvestedOn: string;
  weighmentSlipDocumentIds: string[];
  harvestPhotoDocumentIds: string[];
};

/** Everything the API accepts except the cycle, which is fixed once saved. */
export type HarvestFields = {
  yieldKg: string;
  varietySplit: VarietySplit;
  pricePerKgPaise: string;
  buyer: string;
  harvestedOn: string;
  weighmentSlipDocumentIds: string[];
  harvestPhotoDocumentIds: string[];
};

export type HarvestDraftResult =
  { fields: HarvestFields; error: null } | { fields: null; error: string };

export function initialDraft(harvest: Harvest | null): HarvestDraft {
  if (harvest === null) {
    return {
      cycleId: '',
      yieldKg: '',
      rows: [newVarietyRow()],
      priceRupees: '',
      buyer: '',
      harvestedOn: indiaToday(),
      weighmentSlipDocumentIds: [],
      harvestPhotoDocumentIds: [],
    };
  }

  return {
    cycleId: harvest.cycleId,
    yieldKg: harvest.yieldKg,
    rows: toVarietyRows(harvest.varietySplit),
    priceRupees: paiseToRupeeString(BigInt(harvest.pricePerKgPaise)),
    buyer: harvest.buyer,
    harvestedOn: harvest.harvestedOn,
    weighmentSlipDocumentIds: [...harvest.weighmentSlipDocumentIds],
    harvestPhotoDocumentIds: [...harvest.harvestPhotoDocumentIds],
  };
}

export function validateHarvestDraft(draft: HarvestDraft): HarvestDraftResult {
  if (draft.cycleId === '') {
    return { fields: null, error: 'Choose the cycle this harvest belongs to' };
  }

  const yielded = parseKilograms(draft.yieldKg);
  if (yielded.error !== null) return { fields: null, error: `Total yield: ${yielded.error}` };

  const split = buildVarietySplit(draft.rows, yielded.kg);
  if (split.error !== null) return { fields: null, error: split.error };

  const price = parseRupeeAmount(draft.priceRupees);
  if (price.error !== null) return { fields: null, error: `Realised price: ${price.error}` };

  if (draft.buyer.trim().length < 2) return { fields: null, error: 'Name the buyer' };

  return {
    fields: {
      yieldKg: yielded.kg,
      varietySplit: split.split,
      pricePerKgPaise: price.paise,
      buyer: draft.buyer.trim(),
      harvestedOn: draft.harvestedOn,
      weighmentSlipDocumentIds: draft.weighmentSlipDocumentIds,
      harvestPhotoDocumentIds: draft.harvestPhotoDocumentIds,
    },
    error: null,
  };
}
