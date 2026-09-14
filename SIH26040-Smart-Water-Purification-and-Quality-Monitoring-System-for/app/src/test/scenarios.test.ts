import { describe, expect, it } from "vitest";
import { PlantSim } from "@/sim/engine";
import { ScenarioId } from "@/domain/types";

function snapshotAt(id: ScenarioId, tick: number) {
  const sim = new PlantSim(id, [], tick - 1);
  return sim.step();
}

describe("scenario release states", () => {
  it("SAFE_BASELINE stays SAFE", () => {
    for (const tick of [5, 30, 60, 100]) {
      expect(snapshotAt("SAFE_BASELINE", tick).release.state).toBe("SAFE");
    }
  });

  it("MINE_RUNOFF: conditional → hold on lab exceedance", () => {
    expect(snapshotAt("MINE_RUNOFF", 5).release.state).toBe("CONDITIONAL"); // high TDS feed
    expect(snapshotAt("MINE_RUNOFF", 40).release.state).toBe("CONDITIONAL"); // Mn warn
    const late = snapshotAt("MINE_RUNOFF", 60);
    expect(late.release.state).toBe("HOLD");
    expect(late.release.reasons.some((r) => r.code === "R-IRON-LABFAIL")).toBe(true);
  });

  it("MICROBIAL_RISK: chlorine fault holds release, coliform confirms", () => {
    expect(snapshotAt("MICROBIAL_RISK", 10).release.state).toBe("SAFE");
    const mid = snapshotAt("MICROBIAL_RISK", 20);
    expect(mid.release.state).toBe("HOLD");
    const late = snapshotAt("MICROBIAL_RISK", 45);
    expect(late.release.state).toBe("HOLD");
    expect(late.release.reasons.some((r) => r.code === "R-COLIFORM-LABFAIL")).toBe(true);
  });

  it("SENSOR_DRIFT: trust decays below certification minimum", () => {
    expect(snapshotAt("SENSOR_DRIFT", 8).release.state).toBe("SAFE");
    const mid = snapshotAt("SENSOR_DRIFT", 25);
    // frozen probe → degraded but not yet blocked
    expect(mid.trust.find((x) => x.sensorId === "S-PH")?.score).toBeLessThan(0.75);
    const late = snapshotAt("SENSOR_DRIFT", 40);
    expect(late.release.state).toBe("HOLD");
    expect(late.release.reasons.some((r) => r.i18nKey === "reason.sensorUntrusted")).toBe(true);
  });

  it("FILTER_FAILURE: breakthrough fails outlet turbidity", () => {
    const late = snapshotAt("FILTER_FAILURE", 50);
    expect(late.release.state).toBe("HOLD");
    expect(late.release.reasons.some((r) => r.code === "R-TURBIDITY-FAIL")).toBe(true);
  });

  it("maintenance hold short-circuits to MAINTENANCE", () => {
    const sim = new PlantSim("SAFE_BASELINE", [], 0);
    sim.setMaintenanceHold(true);
    const snap = sim.step();
    expect(snap.release.state).toBe("MAINTENANCE");
  });
});

describe("incidents + work orders", () => {
  it("HOLD opens an incident", () => {
    const snap = snapshotAt("MICROBIAL_RISK", 50);
    expect(snap.incidents.length).toBeGreaterThan(0);
    expect(snap.incidents[0].titleI18nKey).toBe("incident.holdOpened");
  });

  it("work orders raised for faults", () => {
    const snap = snapshotAt("FILTER_FAILURE", 60);
    expect(snap.workOrders.length).toBeGreaterThan(0);
  });
});

describe("determinism", () => {
  it("same seed + tick → identical snapshot", () => {
    const a = new PlantSim("MINE_RUNOFF", [], 70);
    const b = new PlantSim("MINE_RUNOFF", [], 70);
    expect(JSON.stringify(a.step())).toBe(JSON.stringify(b.step()));
  });

  it("different scenarios diverge", () => {
    const a = new PlantSim("SAFE_BASELINE", [], 60);
    const b = new PlantSim("MICROBIAL_RISK", [], 60);
    expect(a.step().release.state).not.toBe(b.step().release.state);
  });
});
