// Release interlock: deterministic, fully explainable.
// Every decision emits an ordered reason chain citing parameter,
// observed value, threshold, and evidence age. No black boxes.

import {
  evaluateEvidence,
  evaluateLive,
  thresholdText,
  BIS_IS_10500,
  LAB_PARAMETERS,
  LIVE_PARAMETERS,
} from "./standards";
import { CERTIFY_MIN } from "./trust";
import {
  AssetHealth,
  LabReport,
  LiveReading,
  Reason,
  ReleaseState,
  SensorTrust,
} from "./types";

export interface InterlockInput {
  now: number;
  live: LiveReading[];
  labEvidence: LabReport[];
  trust: SensorTrust[];
  assets: AssetHealth[];
  maintenanceHold: boolean;
  /** Parameters for which the source profile requires in-date lab evidence. */
  requiredEvidence: Parameters<typeof evaluateEvidence>[0][];
}

const RELEASE_CRITICAL: Parameters<typeof evaluateEvidence>[0][] = [
  "COLIFORM",
  "ARSENIC",
  "FLUORIDE",
  "IRON",
  "MANGANESE",
];

function fmt(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function decideRelease(input: InterlockInput): {
  state: ReleaseState;
  reasons: Reason[];
} {
  const reasons: Reason[] = [];
  const { now } = input;

  if (input.maintenanceHold) {
    reasons.push({ code: "R-MAINT", severity: "BLOCK", i18nKey: "reason.maintenanceHold" });
    return { state: "MAINTENANCE", reasons };
  }

  // 1. Live proxy evaluation.
  for (const code of LIVE_PARAMETERS) {
    const spec = BIS_IS_10500[code];
    const reading = input.live
      .filter((r) => r.code === code)
      .sort((a, b) => b.at - a.at)[0];
    if (!reading) {
      reasons.push({
        code: `R-${code}-NOLIVE`,
        severity: code === "CHLORINE" ? "BLOCK" : "WARN",
        parameter: code,
        i18nKey: "reason.noLiveReading",
      });
      continue;
    }
    const status = evaluateLive(reading);
    const observed = `${fmt(reading.value)}${spec.unit ? ` ${spec.unit}` : ""}`;
    if (status === "FAIL") {
      reasons.push({
        code: `R-${code}-FAIL`,
        severity: "BLOCK",
        parameter: code,
        observed,
        threshold: thresholdText(spec),
        i18nKey: "reason.overLimit",
      });
    } else if (status === "WARN") {
      reasons.push({
        code: `R-${code}-WARN`,
        severity: "WARN",
        parameter: code,
        observed,
        threshold: thresholdText(spec),
        i18nKey: "reason.aboveAcceptable",
      });
    }
  }

  // 2. Lab evidence evaluation — only parameters the source profile requires.
  for (const code of LAB_PARAMETERS) {
    if (!input.requiredEvidence.includes(code)) continue;
    const spec = BIS_IS_10500[code];
    const { status, report, ageDays } = evaluateEvidence(code, input.labEvidence, now);
    const observed =
      report === undefined
        ? undefined
        : typeof report.value === "number"
          ? `${fmt(report.value)}${spec.unit ? ` ${spec.unit}` : ""}`
          : report.value;
    if (status === "MISSING") {
      reasons.push({
        code: `R-${code}-MISSING`,
        severity: spec.safetyCritical ? "BLOCK" : "WARN",
        parameter: code,
        i18nKey: "reason.noLabEvidence",
      });
    } else if (status === "STALE") {
      reasons.push({
        code: `R-${code}-STALE`,
        severity: spec.safetyCritical ? "BLOCK" : "WARN",
        parameter: code,
        observed,
        evidenceAgeDays: ageDays,
        i18nKey: "reason.staleEvidence",
      });
    } else if (status === "FAIL") {
      reasons.push({
        code: `R-${code}-LABFAIL`,
        severity: "BLOCK",
        parameter: code,
        observed,
        threshold: thresholdText(spec),
        evidenceAgeDays: ageDays,
        i18nKey: "reason.labExceeds",
      });
    } else if (status === "WARN") {
      reasons.push({
        code: `R-${code}-LABWARN`,
        severity: "WARN",
        parameter: code,
        observed,
        threshold: thresholdText(spec),
        evidenceAgeDays: ageDays,
        i18nKey: "reason.labAboveAcceptable",
      });
    }
  }

  // 3. Sensor trust gates certification.
  for (const t of input.trust) {
    if (t.score < CERTIFY_MIN) {
      reasons.push({
        code: `R-TRUST-${t.sensorId}`,
        severity: "BLOCK",
        parameter: t.parameter,
        observed: `TRUST ${(t.score * 100).toFixed(0)}% < ${CERTIFY_MIN * 100}%`,
        i18nKey: "reason.sensorUntrusted",
      });
    } else if (t.flags.length > 0) {
      reasons.push({
        code: `R-TRUSTW-${t.sensorId}`,
        severity: "WARN",
        parameter: t.parameter,
        observed: `TRUST ${(t.score * 100).toFixed(0)}% · ${t.flags.join("+")}`,
        i18nKey: "reason.sensorDegraded",
      });
    }
  }

  // 4. Asset health contributes warnings (failure handled by scenario via proxies).
  for (const a of input.assets) {
    if (a.remainingFraction < 0.35) {
      reasons.push({
        code: `R-ASSET-${a.assetId}`,
        severity: a.remainingFraction < 0.1 ? "BLOCK" : "WARN",
        observed: `RUL ${(a.remainingFraction * 100).toFixed(0)}%`,
        i18nKey:
          a.remainingFraction < 0.1
            ? "reason.assetExhausted"
            : "reason.assetDegraded",
      });
    }
  }

  // 5. Disinfection verification: chlorine residual must be present.
  const chlorine = input.live
    .filter((r) => r.code === "CHLORINE")
    .sort((a, b) => b.at - a.at)[0];
  if (chlorine && chlorine.value < (BIS_IS_10500.CHLORINE.acceptableMin ?? 0.2)) {
    if (!reasons.some((r) => r.code === "R-CHLORINE-FAIL")) {
      reasons.push({
        code: "R-DISINF-UNVERIFIED",
        severity: "BLOCK",
        parameter: "CHLORINE",
        observed: `${fmt(chlorine.value)} MG/L`,
        threshold: thresholdText(BIS_IS_10500.CHLORINE),
        i18nKey: "reason.disinfectionUnverified",
      });
    }
  }

  const state: ReleaseState = reasons.some((r) => r.severity === "BLOCK")
    ? "HOLD"
    : reasons.some((r) => r.severity === "WARN")
      ? "CONDITIONAL"
      : "SAFE";

  const order = { BLOCK: 0, WARN: 1, INFO: 2 } as const;
  reasons.sort((a, b) => order[a.severity] - order[b.severity]);
  return { state, reasons };
}

export { RELEASE_CRITICAL };
