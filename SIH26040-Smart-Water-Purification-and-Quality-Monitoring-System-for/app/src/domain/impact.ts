// Impact accounting: counters → labelled estimates. Honest units, EST. marks.

import { ImpactCounters } from "./types";

export interface ImpactMetric {
  id: string;
  value: number;
  unit: string;
  i18nKey: string;
  estimate: boolean;
}

const SAFE_L_PER_PERSON_DAY = 8;
const TANKER_COST_PER_L = 0.6; // INR estimate for tanker/bottled alternative
const PLANT_COST_PER_L = 0.12; // INR estimate: power + media + consumables

export function impactMetrics(c: ImpactCounters): ImpactMetric[] {
  return [
    {
      id: "safe_litres",
      value: Math.round(c.litresCertifiedSafe),
      unit: "L",
      i18nKey: "impact.safeLitres",
      estimate: false,
    },
    {
      id: "person_days",
      value: Math.round(c.litresCertifiedSafe / SAFE_L_PER_PERSON_DAY),
      unit: "P-DAYS",
      i18nKey: "impact.personDays",
      estimate: true,
    },
    {
      id: "exposure_prevented",
      value: Math.round(c.holdLitresPrevented),
      unit: "L",
      i18nKey: "impact.exposurePrevented",
      estimate: false,
    },
    {
      id: "cost_delta",
      value: Math.round(
        c.litresCertifiedSafe * (TANKER_COST_PER_L - PLANT_COST_PER_L)
      ),
      unit: "₹",
      i18nKey: "impact.costDelta",
      estimate: true,
    },
    {
      id: "contaminant_mass",
      value: Math.round(c.contaminantGramsRemoved),
      unit: "G",
      i18nKey: "impact.contaminantMass",
      estimate: true,
    },
    {
      id: "energy_per_litre",
      value: c.litresTreated > 0 ? c.energyKwh / c.litresTreated : 0,
      unit: "WH/L",
      i18nKey: "impact.energyPerLitre",
      estimate: false,
    },
  ];
}
