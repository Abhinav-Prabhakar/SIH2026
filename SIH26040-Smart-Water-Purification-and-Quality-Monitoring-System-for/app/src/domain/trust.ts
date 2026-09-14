// Sensor trust: transparent weighted scoring, never a boolean.
// Inputs are surfaced in `flags` so the UI can show why trust is low.

import { DAY_MS, LiveReading, SensorTrust } from "./types";

export const CALIBRATION_INTERVAL_DAYS = 14;
export const CERTIFY_MIN = 0.4;

const FLAG_PENALTY = { DRIFT: 0.25, FROZEN: 0.3, CONTRADICTION: 0.35 } as const;
const CAL_OVERDUE_PENALTY_PER_DAY = 0.02;
const CAL_OVERDUE_PENALTY_MAX = 0.3;

export interface SensorDef {
  sensorId: string;
  parameter: LiveReading["code"];
  lastCalibratedAt: number;
}

export function computeTrust(
  def: SensorDef,
  history: LiveReading[],
  now: number,
  contradiction: boolean
): SensorTrust {
  const flags: SensorTrust["flags"] = [];
  const daysSinceCal = (now - def.lastCalibratedAt) / DAY_MS;
  let score = 1;

  if (daysSinceCal > CALIBRATION_INTERVAL_DAYS) {
    flags.push("CAL_OVERDUE");
    score -= Math.min(
      CAL_OVERDUE_PENALTY_MAX,
      (daysSinceCal - CALIBRATION_INTERVAL_DAYS) * CAL_OVERDUE_PENALTY_PER_DAY
    );
  }

  const recent = history.slice(-12);
  if (recent.length >= 6) {
    const values = recent.map((r) => r.value);
    const spread = Math.max(...values) - Math.min(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    // Frozen: effectively constant over the window.
    if (spread < Math.max(0.001, Math.abs(mean) * 0.002)) flags.push("FROZEN");
    // Drift: monotonic creep across the window.
    else {
      let up = 0;
      let down = 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i] > values[i - 1]) up++;
        else if (values[i] < values[i - 1]) down++;
      }
      const mono = Math.max(up, down) / (values.length - 1);
      if (mono >= 0.9) flags.push("DRIFT");
    }
  }

  if (contradiction) flags.push("CONTRADICTION");

  for (const f of flags) {
    if (f === "DRIFT") score -= FLAG_PENALTY.DRIFT;
    if (f === "FROZEN") score -= FLAG_PENALTY.FROZEN;
    if (f === "CONTRADICTION") score -= FLAG_PENALTY.CONTRADICTION;
  }

  return {
    sensorId: def.sensorId,
    parameter: def.parameter,
    score: Math.max(0, Math.min(1, score)),
    lastCalibratedAt: def.lastCalibratedAt,
    flags,
  };
}
