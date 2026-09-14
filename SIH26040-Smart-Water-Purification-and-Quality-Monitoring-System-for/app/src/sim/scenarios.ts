// Deterministic scenario scripts. Each defines a seed, source profile,
// baseline lab evidence, and timed world mutations. Replays are identical.

import { LabReport, ScenarioId } from "@/domain/types";

export interface SimEvent {
  atTick: number;
  i18nKey: string;
  apply: (w: MutableWorld, now: number) => void;
}

/** The slice of world state scenario events are allowed to mutate. */
export interface MutableWorld {
  feedTurbidity: number;
  feedTds: number;
  feedPh: number;
  feedTemp: number;
  removalEfficiency: number;
  adaptiveEngaged: boolean;
  chlorineDoseOk: boolean;
  uvOk: boolean;
  frozenSensor: string | null;
  frozenValue: number;
  contradictionSensor: string | null;
  labReports: LabReport[];
}

export interface ScenarioDef {
  id: ScenarioId;
  seed: number;
  i18nKey: string;
  blurbI18nKey: string;
  sourceProfile: string;
  baselineReports: (epoch0: number) => LabReport[];
  events: SimEvent[];
}

const DAY = 86_400_000;
const lab = (
  id: string,
  parameter: LabReport["parameter"],
  value: LabReport["value"],
  sampledAgoDays: number,
  epoch0: number
): LabReport => ({
  id,
  parameter,
  value,
  lab: "DWTL RANCHI",
  sampledAt: epoch0 - sampledAgoDays * DAY,
  reportedAt: epoch0 - sampledAgoDays * DAY + 2 * DAY,
});

function cleanBaseline(epoch0: number, withColiform = true): LabReport[] {
  const r: LabReport[] = [
    lab("L-FE-0", "IRON", 0.6, 5, epoch0),
    lab("L-MN-0", "MANGANESE", 0.06, 5, epoch0),
    lab("L-F-0", "FLUORIDE", 0.8, 5, epoch0),
    lab("L-AS-0", "ARSENIC", 0.004, 5, epoch0),
    lab("L-NO3-0", "NITRATE", 12, 5, epoch0),
  ];
  if (withColiform) r.push(lab("L-COL-0", "COLIFORM", "ABSENT", 4, epoch0));
  return r;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  SAFE_BASELINE: {
    id: "SAFE_BASELINE",
    seed: 0x51a7,
    i18nKey: "scenario.safeBaseline",
    blurbI18nKey: "scenario.safeBaseline.blurb",
    sourceProfile: "BOREWELL_FE",
    baselineReports: (e0) => cleanBaseline(e0),
    events: [],
  },

  MINE_RUNOFF: {
    id: "MINE_RUNOFF",
    seed: 0x9e11,
    i18nKey: "scenario.mineRunoff",
    blurbI18nKey: "scenario.mineRunoff.blurb",
    sourceProfile: "MINE_AFFECTED",
    baselineReports: (e0) => cleanBaseline(e0),
    events: [
      {
        atTick: 12,
        i18nKey: "event.mineRunoff.rain",
        apply: (w) => {
          w.feedTurbidity *= 1.9;
          w.feedTds *= 1.15;
        },
      },
      {
        atTick: 30,
        i18nKey: "event.mineRunoff.labMn",
        apply: (w, now) => {
          w.labReports.push({
            id: "L-MN-RUNOFF",
            parameter: "MANGANESE",
            value: 0.22,
            lab: "DWTL RANCHI",
            sampledAt: now - DAY,
            reportedAt: now,
          });
        },
      },
      {
        atTick: 55,
        i18nKey: "event.mineRunoff.labFe",
        apply: (w, now) => {
          w.labReports.push({
            id: "L-FE-RUNOFF",
            parameter: "IRON",
            value: 2.4,
            lab: "DWTL RANCHI",
            sampledAt: now - DAY,
            reportedAt: now,
          });
          w.adaptiveEngaged = true;
        },
      },
    ],
  },

  MICROBIAL_RISK: {
    id: "MICROBIAL_RISK",
    seed: 0xc0f1,
    i18nKey: "scenario.microbialRisk",
    blurbI18nKey: "scenario.microbialRisk.blurb",
    sourceProfile: "BOREWELL_FE",
    baselineReports: (e0) => cleanBaseline(e0),
    events: [
      {
        atTick: 15,
        i18nKey: "event.microbial.doseFault",
        apply: (w) => {
          w.chlorineDoseOk = false;
        },
      },
      {
        atTick: 40,
        i18nKey: "event.microbial.labColiform",
        apply: (w, now) => {
          w.labReports.push({
            id: "L-COL-RISK",
            parameter: "COLIFORM",
            value: "DETECTED",
            lab: "DWTL RANCHI",
            sampledAt: now - DAY,
            reportedAt: now,
          });
        },
      },
    ],
  },

  SENSOR_DRIFT: {
    id: "SENSOR_DRIFT",
    seed: 0xd21f,
    i18nKey: "scenario.sensorDrift",
    blurbI18nKey: "scenario.sensorDrift.blurb",
    sourceProfile: "BOREWELL_FE",
    baselineReports: (e0) => cleanBaseline(e0),
    events: [
      {
        atTick: 10,
        i18nKey: "event.drift.freeze",
        apply: (w) => {
          w.frozenSensor = "PH";
          w.frozenValue = 7.42;
        },
      },
      {
        atTick: 34,
        i18nKey: "event.drift.contradiction",
        apply: (w) => {
          w.contradictionSensor = "PH";
        },
      },
    ],
  },

  FILTER_FAILURE: {
    id: "FILTER_FAILURE",
    seed: 0xf17e,
    i18nKey: "scenario.filterFailure",
    blurbI18nKey: "scenario.filterFailure.blurb",
    sourceProfile: "MINE_AFFECTED",
    baselineReports: (e0) => cleanBaseline(e0),
    events: [
      {
        atTick: 14,
        i18nKey: "event.filter.degrade",
        apply: (w) => {
          w.removalEfficiency = 0.35;
        },
      },
      {
        atTick: 42,
        i18nKey: "event.filter.breakthrough",
        apply: (w) => {
          w.removalEfficiency = 0.08;
        },
      },
    ],
  },
};
