// Physical treatment-train model: stage definitions and plumbing metadata.
// Transfer behavior lives in the simulation; this is the static topology.

import { StageId } from "./types";

export interface StageDef {
  id: StageId;
  i18nKey: string;
  summary: string;
}

export const STAGES: StageDef[] = [
  { id: "INTAKE", i18nKey: "stage.intake", summary: "Raw source draw + strainer" },
  { id: "PRETREAT", i18nKey: "stage.pretreat", summary: "MGF / sedimentation" },
  { id: "FE_MN_MEDIA", i18nKey: "stage.femn", summary: "Aeration + catalytic media" },
  { id: "CARBON", i18nKey: "stage.carbon", summary: "Activated carbon polish" },
  { id: "ADAPTIVE", i18nKey: "stage.adaptive", summary: "Alumina / RO — evidence-gated" },
  { id: "DISINFECTION", i18nKey: "stage.disinfection", summary: "UV + chlorine dose" },
  { id: "OUTLET", i18nKey: "stage.outlet", summary: "Verification + release valve" },
];

export interface SourceProfile {
  id: string;
  i18nKey: string;
  /** Lab parameters this source requires in-date evidence for. */
  requiredEvidence: import("./types").ParameterCode[];
  /** Baseline feed signature used by the sim. */
  feed: { turbidity: number; tds: number; ph: number; temperature: number };
  loadFactor: number;
}

export const SOURCE_PROFILES: Record<string, SourceProfile> = {
  BOREWELL_FE: {
    id: "BOREWELL_FE",
    i18nKey: "source.borewellFe",
    requiredEvidence: ["IRON", "MANGANESE", "FLUORIDE", "ARSENIC", "COLIFORM"],
    feed: { turbidity: 8, tds: 470, ph: 7.1, temperature: 26 },
    loadFactor: 1.1,
  },
  MINE_AFFECTED: {
    id: "MINE_AFFECTED",
    i18nKey: "source.mineAffected",
    requiredEvidence: ["IRON", "MANGANESE", "ARSENIC", "FLUORIDE", "NITRATE", "COLIFORM"],
    feed: { turbidity: 22, tds: 1150, ph: 6.8, temperature: 27 },
    loadFactor: 1.6,
  },
};
