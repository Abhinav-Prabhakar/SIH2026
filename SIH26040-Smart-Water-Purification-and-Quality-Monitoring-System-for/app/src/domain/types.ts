// NEER//OS domain model — pure TypeScript, no framework dependencies.

export type ParameterCode =
  | "PH"
  | "TURBIDITY"
  | "TDS"
  | "TEMPERATURE"
  | "CHLORINE"
  | "IRON"
  | "FLUORIDE"
  | "ARSENIC"
  | "MANGANESE"
  | "NITRATE"
  | "COLIFORM";

export type Sensing = "LIVE" | "LAB";

export interface ParameterSpec {
  code: ParameterCode;
  label: string;
  unit: string | null;
  /** BIS IS 10500 acceptable band. */
  acceptableMin?: number;
  acceptableMax?: number;
  /** BIS permissible limit (absence of alternate source). Absent = no relaxation. */
  permissibleMax?: number;
  sensing: Sensing;
  /** Days a lab result stays current before it is treated as stale. */
  freshnessHorizonDays?: number;
  /** If true, missing/stale evidence blocks SAFE certification. */
  safetyCritical?: boolean;
}

export interface LiveReading {
  code: ParameterCode;
  value: number;
  at: number;
  sensorId: string;
}

export type LabValue = number | "DETECTED" | "ABSENT";

export interface LabReport {
  id: string;
  parameter: ParameterCode;
  value: LabValue;
  lab: string;
  sampledAt: number;
  reportedAt: number;
}

export type ReleaseState = "SAFE" | "CONDITIONAL" | "HOLD" | "MAINTENANCE";

export type Severity = "BLOCK" | "WARN" | "INFO";

export interface Reason {
  code: string;
  severity: Severity;
  parameter?: ParameterCode;
  observed?: string;
  threshold?: string;
  evidenceAgeDays?: number;
  i18nKey: string;
}

export type TrustFlag = "DRIFT" | "FROZEN" | "CONTRADICTION" | "CAL_OVERDUE";

export interface SensorTrust {
  sensorId: string;
  parameter: ParameterCode;
  score: number;
  lastCalibratedAt: number;
  flags: TrustFlag[];
}

export type AssetKind = "MEDIA" | "CARBON" | "LAMP" | "DOSE" | "MEMBRANE";

export interface AssetHealth {
  assetId: string;
  kind: AssetKind;
  name: string;
  remainingFraction: number;
  basis: string[];
}

export type StageId =
  | "INTAKE"
  | "PRETREAT"
  | "FE_MN_MEDIA"
  | "CARBON"
  | "ADAPTIVE"
  | "DISINFECTION"
  | "OUTLET";

export interface StageState {
  id: StageId;
  name: string;
  active: boolean;
  fault: boolean;
  metrics: { label: string; value: string }[];
  note?: string;
}

export type ScenarioId =
  | "SAFE_BASELINE"
  | "MINE_RUNOFF"
  | "MICROBIAL_RISK"
  | "SENSOR_DRIFT"
  | "FILTER_FAILURE";

export interface Connectivity {
  online: boolean;
  lastSyncAt: number;
  queuedEvents: number;
}

export interface ImpactCounters {
  litresTreated: number;
  litresCertifiedSafe: number;
  holdEvents: number;
  holdLitresPrevented: number;
  contaminantGramsRemoved: number;
  rejectLitres: number;
  energyKwh: number;
}

export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export interface WorkOrder {
  id: string;
  titleI18nKey: string;
  assetId?: string;
  reason: string;
  dueAt: number;
  status: WorkOrderStatus;
}

export interface Incident {
  id: string;
  openedAt: number;
  closedAt?: number;
  titleI18nKey: string;
  reasons: Reason[];
  acknowledged: boolean;
}

export interface LiveSeries {
  code: ParameterCode;
  sensorId: string;
  values: number[];
}

export interface PlantSnapshot {
  at: number;
  scenario: ScenarioId;
  sourceProfile: string;
  live: LiveReading[];
  series: LiveSeries[];
  releaseTape: ReleaseState[];
  labEvidence: LabReport[];
  trust: SensorTrust[];
  assets: AssetHealth[];
  stages: StageState[];
  release: { state: ReleaseState; reasons: Reason[] };
  connectivity: Connectivity;
  counters: ImpactCounters;
  workOrders: WorkOrder[];
  incidents: Incident[];
  flowLph: number;
}

export const SCENARIO_IDS: ScenarioId[] = [
  "SAFE_BASELINE",
  "MINE_RUNOFF",
  "MICROBIAL_RISK",
  "SENSOR_DRIFT",
  "FILTER_FAILURE",
];

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
