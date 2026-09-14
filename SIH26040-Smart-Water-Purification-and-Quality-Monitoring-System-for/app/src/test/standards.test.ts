import { describe, expect, it } from "vitest";
import {
  BIS_IS_10500,
  evaluateEvidence,
  evaluateValue,
} from "@/domain/standards";
import { DAY_MS, LabReport } from "@/domain/types";

const NOW = 1_780_000_000_000;

const report = (parameter: LabReport["parameter"], value: LabReport["value"], ageDays: number): LabReport => ({
  id: "T",
  parameter,
  value,
  lab: "TEST",
  sampledAt: NOW - ageDays * DAY_MS,
  reportedAt: NOW - ageDays * DAY_MS,
});

describe("BIS IS 10500 evaluation", () => {
  it("pH band edges", () => {
    expect(evaluateValue(BIS_IS_10500.PH, 7.2)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.PH, 6.5)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.PH, 8.5)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.PH, 8.6)).toBe("FAIL");
    expect(evaluateValue(BIS_IS_10500.PH, 6.4)).toBe("FAIL");
  });

  it("turbidity acceptable vs permissible", () => {
    expect(evaluateValue(BIS_IS_10500.TURBIDITY, 0.8)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.TURBIDITY, 3)).toBe("WARN");
    expect(evaluateValue(BIS_IS_10500.TURBIDITY, 5)).toBe("WARN");
    expect(evaluateValue(BIS_IS_10500.TURBIDITY, 5.1)).toBe("FAIL");
  });

  it("iron has no permissible relaxation — above acceptable = FAIL", () => {
    expect(evaluateValue(BIS_IS_10500.IRON, 0.9)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.IRON, 1.0)).toBe("OK");
    expect(evaluateValue(BIS_IS_10500.IRON, 1.01)).toBe("FAIL");
  });

  it("fluoride uses permissible band", () => {
    expect(evaluateValue(BIS_IS_10500.FLUORIDE, 1.2)).toBe("WARN");
    expect(evaluateValue(BIS_IS_10500.FLUORIDE, 1.6)).toBe("FAIL");
  });
});

describe("lab evidence freshness", () => {
  it("newest report wins", () => {
    const reports = [report("IRON", 2.4, 30), report("IRON", 0.6, 3)];
    expect(evaluateEvidence("IRON", reports, NOW).status).toBe("OK");
  });

  it("stale beyond horizon", () => {
    const reports = [report("IRON", 0.6, 31)];
    expect(evaluateEvidence("IRON", reports, NOW).status).toBe("STALE");
    expect(evaluateEvidence("IRON", [report("IRON", 0.6, 30)], NOW).status).toBe("OK");
  });

  it("missing when no report", () => {
    expect(evaluateEvidence("ARSENIC", [], NOW).status).toBe("MISSING");
  });

  it("coliform detection fails", () => {
    expect(evaluateEvidence("COLIFORM", [report("COLIFORM", "DETECTED", 1)], NOW).status).toBe("FAIL");
    expect(evaluateEvidence("COLIFORM", [report("COLIFORM", "ABSENT", 1)], NOW).status).toBe("OK");
  });
});
