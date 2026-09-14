// BIS IS 10500:2012 drinking-water specification — acceptable vs. permissible.
// Live-sensed parameters are proxies; lab parameters carry dated evidence.

import {
  DAY_MS,
  LabReport,
  LiveReading,
  ParameterCode,
  ParameterSpec,
} from "./types";

export const BIS_IS_10500: Record<ParameterCode, ParameterSpec> = {
  PH: {
    code: "PH",
    label: "pH",
    unit: null,
    acceptableMin: 6.5,
    acceptableMax: 8.5,
    sensing: "LIVE",
  },
  TURBIDITY: {
    code: "TURBIDITY",
    label: "TURBIDITY",
    unit: "NTU",
    acceptableMax: 1,
    permissibleMax: 5,
    sensing: "LIVE",
  },
  TDS: {
    code: "TDS",
    label: "TDS",
    unit: "MG/L",
    acceptableMax: 500,
    permissibleMax: 2000,
    sensing: "LIVE",
  },
  TEMPERATURE: {
    code: "TEMPERATURE",
    label: "TEMPERATURE",
    unit: "°C",
    sensing: "LIVE",
  },
  CHLORINE: {
    code: "CHLORINE",
    label: "FREE CL2",
    unit: "MG/L",
    acceptableMin: 0.2,
    acceptableMax: 1.0,
    sensing: "LIVE",
  },
  IRON: {
    code: "IRON",
    label: "IRON FE",
    unit: "MG/L",
    acceptableMax: 1.0,
    sensing: "LAB",
    freshnessHorizonDays: 30,
    safetyCritical: true,
  },
  FLUORIDE: {
    code: "FLUORIDE",
    label: "FLUORIDE F-",
    unit: "MG/L",
    acceptableMax: 1.0,
    permissibleMax: 1.5,
    sensing: "LAB",
    freshnessHorizonDays: 30,
    safetyCritical: true,
  },
  ARSENIC: {
    code: "ARSENIC",
    label: "ARSENIC AS",
    unit: "MG/L",
    acceptableMax: 0.01,
    sensing: "LAB",
    freshnessHorizonDays: 30,
    safetyCritical: true,
  },
  MANGANESE: {
    code: "MANGANESE",
    label: "MANGANESE MN",
    unit: "MG/L",
    acceptableMax: 0.1,
    permissibleMax: 0.3,
    sensing: "LAB",
    freshnessHorizonDays: 30,
    safetyCritical: true,
  },
  NITRATE: {
    code: "NITRATE",
    label: "NITRATE",
    unit: "MG/L",
    acceptableMax: 45,
    sensing: "LAB",
    freshnessHorizonDays: 45,
  },
  COLIFORM: {
    code: "COLIFORM",
    label: "COLIFORM",
    unit: "CFU/100ML",
    acceptableMax: 0,
    sensing: "LAB",
    freshnessHorizonDays: 14,
    safetyCritical: true,
  },
};

export const LIVE_PARAMETERS: ParameterCode[] = (
  Object.keys(BIS_IS_10500) as ParameterCode[]
).filter((c) => BIS_IS_10500[c].sensing === "LIVE");

export const LAB_PARAMETERS: ParameterCode[] = (
  Object.keys(BIS_IS_10500) as ParameterCode[]
).filter((c) => BIS_IS_10500[c].sensing === "LAB");

export type ParamStatus = "OK" | "WARN" | "FAIL";

export function evaluateValue(spec: ParameterSpec, value: number): ParamStatus {
  const { acceptableMin, acceptableMax, permissibleMax } = spec;
  // Parameters with no defined limits (e.g. temperature) are context-only.
  if (
    acceptableMin === undefined &&
    acceptableMax === undefined &&
    permissibleMax === undefined
  )
    return "OK";
  if (acceptableMin !== undefined && value < acceptableMin) return "FAIL";
  if (acceptableMax !== undefined && value <= acceptableMax) return "OK";
  if (permissibleMax !== undefined && value <= permissibleMax) return "WARN";
  return "FAIL";
}

export function evaluateLive(reading: LiveReading): ParamStatus {
  return evaluateValue(BIS_IS_10500[reading.code], reading.value);
}

export type EvidenceStatus = "OK" | "WARN" | "FAIL" | "STALE" | "MISSING";

export function evidenceAgeDays(report: LabReport, now: number): number {
  return Math.floor((now - report.sampledAt) / DAY_MS);
}

export function isStale(spec: ParameterSpec, report: LabReport, now: number): boolean {
  const horizon = spec.freshnessHorizonDays;
  if (horizon === undefined) return false;
  return now - report.sampledAt > horizon * DAY_MS;
}

/** Newest report for a parameter wins; absent report = MISSING. */
export function evaluateEvidence(
  code: ParameterCode,
  reports: LabReport[],
  now: number
): { status: EvidenceStatus; report?: LabReport; ageDays?: number } {
  const spec = BIS_IS_10500[code];
  const relevant = reports
    .filter((r) => r.parameter === code)
    .sort((a, b) => b.sampledAt - a.sampledAt);
  const report = relevant[0];
  if (!report) return { status: "MISSING" };
  const ageDays = evidenceAgeDays(report, now);
  if (isStale(spec, report, now)) return { status: "STALE", report, ageDays };
  if (report.value === "DETECTED") return { status: "FAIL", report, ageDays };
  if (report.value === "ABSENT") return { status: "OK", report, ageDays };
  return { status: evaluateValue(spec, report.value), report, ageDays };
}

export function thresholdText(spec: ParameterSpec): string {
  const u = spec.unit ? ` ${spec.unit}` : "";
  const parts: string[] = [];
  if (spec.acceptableMin !== undefined || spec.acceptableMax !== undefined) {
    const lo = spec.acceptableMin !== undefined ? `${spec.acceptableMin}` : "";
    const hi = spec.acceptableMax !== undefined ? `${spec.acceptableMax}` : "";
    parts.push(lo && hi ? `ACC ${lo}–${hi}${u}` : `ACC ${lo || hi}${u}`);
  }
  if (spec.permissibleMax !== undefined) parts.push(`PERM ≤${spec.permissibleMax}${u}`);
  return parts.join(" · ") || "—";
}
