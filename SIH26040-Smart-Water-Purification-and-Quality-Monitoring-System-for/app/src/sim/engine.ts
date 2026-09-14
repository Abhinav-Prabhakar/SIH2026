// Plant simulation engine: seeded world + tick loop → PlantSnapshot.
// Deterministic: fixed epoch0 + scenario seed. Overlays (user actions)
// replay at their recorded tick so persistence restores identical state.

import { decideRelease } from "@/domain/interlock";
import { computeAssetHealth, ASSET_DEFS } from "@/domain/maintenance";
import { SOURCE_PROFILES, STAGES } from "@/domain/plant";
import { computeTrust, SensorDef } from "@/domain/trust";
import {
  Incident,
  LabReport,
  LiveReading,
  ParameterCode,
  PlantSnapshot,
  ScenarioId,
  StageState,
  WorkOrder,
  WorkOrderStatus,
} from "@/domain/types";
import { mulberry32, noise } from "./rng";
import { MutableWorld, SCENARIOS } from "./scenarios";

export const TICK_MS = 30_000;
export const EPOCH0 = 1_780_000_000_000; // fixed demo epoch — replays identical
export const FLOW_LPH = 1000;

export type OverlayEvent =
  | { atTick: number; kind: "LAB"; report: LabReport }
  | { atTick: number; kind: "WO_STATUS"; id: string; status: WorkOrderStatus }
  | { atTick: number; kind: "ACK"; id: string }
  | { atTick: number; kind: "MAINT"; hold: boolean };

interface World extends MutableWorld {
  tick: number;
  epoch: number;
  treatedKL: number;
  adaptiveKL: number;
  backwashes: number;
  lampHours: number;
  dosePct: number;
  maintenanceHold: boolean;
  history: Record<string, LiveReading[]>;
  counters: PlantSnapshot["counters"];
  workOrders: WorkOrder[];
  incidents: Incident[];
  woStatus: Record<string, WorkOrderStatus>;
  acknowledged: string[];
  eventLog: { tick: number; i18nKey: string }[];
  releaseTape: import("@/domain/types").ReleaseState[];
  prevRelease: string;
  offline: boolean;
  queued: number;
  lastSyncAt: number;
}

const SENSORS: { sensorId: string; parameter: ParameterCode }[] = [
  { sensorId: "S-PH", parameter: "PH" },
  { sensorId: "S-TURB", parameter: "TURBIDITY" },
  { sensorId: "S-TDS", parameter: "TDS" },
  { sensorId: "S-TEMP", parameter: "TEMPERATURE" },
  { sensorId: "S-CL2", parameter: "CHLORINE" },
];

const CAL_AGE_DAYS: Record<string, number> = {
  "S-PH": 4,
  "S-TURB": 6,
  "S-TDS": 6,
  "S-TEMP": 10,
  "S-CL2": 9,
};

export class PlantSim {
  private rng: () => number;
  private w: World;
  readonly scenarioId: ScenarioId;
  private overlay: OverlayEvent[];

  constructor(scenarioId: ScenarioId, overlay: OverlayEvent[] = [], toTick = 0) {
    this.scenarioId = scenarioId;
    this.overlay = [...overlay].sort((a, b) => a.atTick - b.atTick);
    const def = SCENARIOS[scenarioId];
    this.rng = mulberry32(def.seed);
    const src = SOURCE_PROFILES[def.sourceProfile];
    this.w = {
      tick: 0,
      epoch: EPOCH0,
      feedTurbidity: src.feed.turbidity,
      feedTds: src.feed.tds,
      feedPh: src.feed.ph,
      feedTemp: src.feed.temperature,
      removalEfficiency: 0.92,
      adaptiveEngaged: false,
      chlorineDoseOk: true,
      uvOk: true,
      frozenSensor: null,
      frozenValue: 0,
      contradictionSensor: null,
      labReports: def.baselineReports(EPOCH0),
      treatedKL: 1200,
      adaptiveKL: 150,
      backwashes: 34,
      lampHours: 2350,
      dosePct: 0.62,
      maintenanceHold: false,
      history: {},
      counters: {
        litresTreated: 1_200_000,
        litresCertifiedSafe: 1_148_000,
        holdEvents: 0,
        holdLitresPrevented: 0,
        contaminantGramsRemoved: 4_300,
        rejectLitres: 27_200,
        energyKwh: 1_140,
      },
      workOrders: [],
      incidents: [],
      woStatus: {},
      acknowledged: [],
      eventLog: [],
      releaseTape: [],
      prevRelease: "SAFE",
      offline: false,
      queued: 0,
      lastSyncAt: EPOCH0,
    };
    for (let i = 0; i < toTick; i++) this.step();
  }

  get tick(): number {
    return this.w.tick;
  }

  addLabReport(report: LabReport): void {
    const normalized: LabReport = {
      ...report,
      reportedAt: this.w.epoch,
    };
    this.overlay.push({ atTick: this.w.tick, kind: "LAB", report: normalized });
    this.w.labReports.push(normalized);
    this.w.eventLog.push({ tick: this.w.tick, i18nKey: "event.user.labSubmitted" });
  }

  setWorkOrderStatus(id: string, status: WorkOrderStatus): void {
    this.overlay.push({ atTick: this.w.tick, kind: "WO_STATUS", id, status });
    this.w.woStatus[id] = status;
  }

  acknowledgeIncident(id: string): void {
    this.overlay.push({ atTick: this.w.tick, kind: "ACK", id });
    if (!this.w.acknowledged.includes(id)) this.w.acknowledged.push(id);
  }

  setMaintenanceHold(hold: boolean): void {
    this.overlay.push({ atTick: this.w.tick, kind: "MAINT", hold });
    this.w.maintenanceHold = hold;
    this.w.eventLog.push({ tick: this.w.tick, i18nKey: hold ? "event.user.maintOn" : "event.user.maintOff" });
  }

  getOverlay(): OverlayEvent[] {
    return this.overlay;
  }

  get eventLog(): { tick: number; i18nKey: string }[] {
    return this.w.eventLog;
  }

  private applyOverlays(): void {
    for (const e of this.overlay.filter((o) => o.atTick === this.w.tick)) {
      if (e.kind === "LAB") this.w.labReports.push(e.report);
      else if (e.kind === "WO_STATUS") this.w.woStatus[e.id] = e.status;
      else if (e.kind === "ACK") {
        if (!this.w.acknowledged.includes(e.id)) this.w.acknowledged.push(e.id);
      } else if (e.kind === "MAINT") this.w.maintenanceHold = e.hold;
    }
  }

  step(): PlantSnapshot {
    const w = this.w;
    w.tick += 1;
    w.epoch = EPOCH0 + w.tick * TICK_MS;
    const def = SCENARIOS[this.scenarioId];

    // Scenario script events.
    for (const e of def.events.filter((e) => e.atTick === w.tick)) {
      e.apply(w, w.epoch);
      w.eventLog.push({ tick: w.tick, i18nKey: e.i18nKey });
    }
    this.applyOverlays();

    // Deterministic connectivity pattern.
    const phase = w.tick % 240;
    const offline = phase >= 150 && phase < 185;
    if (offline) {
      w.queued += 1;
    } else {
      if (w.offline) w.lastSyncAt = w.epoch;
      w.queued = 0;
    }
    w.offline = offline;

    const snap = this.buildSnapshot();
    // Incident lifecycle: open on transition into HOLD, close on SAFE.
    if (snap.release.state === "HOLD" && w.prevRelease !== "HOLD") {
      w.incidents.unshift({
        id: `INC-${w.tick}`,
        openedAt: w.epoch,
        titleI18nKey: "incident.holdOpened",
        reasons: snap.release.reasons.filter((r) => r.severity === "BLOCK"),
        acknowledged: false,
      });
      w.counters.holdEvents += 1;
    }
    if (snap.release.state === "SAFE" && w.prevRelease === "HOLD" && w.incidents[0] && !w.incidents[0].closedAt) {
      w.incidents[0].closedAt = w.epoch;
    }
    w.prevRelease = snap.release.state;

    // Work-order generation (deduped by id).
    const wantWO = (id: string, titleI18nKey: string, reason: string, assetId?: string) => {
      if (!w.workOrders.some((o) => o.id === id)) {
        w.workOrders.push({ id, titleI18nKey, reason, assetId, dueAt: w.epoch, status: w.woStatus[id] ?? "OPEN" });
      }
    };
    for (const a of snap.assets) {
      if (a.remainingFraction < 0.35) wantWO(`WO-${a.assetId}`, "wo.serviceAsset", `${a.name} RUL ${(a.remainingFraction * 100).toFixed(0)}%`, a.assetId);
    }
    for (const t of snap.trust) {
      if (t.flags.includes("CAL_OVERDUE")) wantWO(`WO-CAL-${t.sensorId}`, "wo.calibrate", `${t.sensorId} CAL OVERDUE`);
      if (t.flags.includes("FROZEN") || t.flags.includes("CONTRADICTION"))
        wantWO(`WO-FIX-${t.sensorId}`, "wo.inspectSensor", `${t.sensorId} ${t.flags.join("+")}`);
    }
    if (!w.chlorineDoseOk) wantWO("WO-DOSE", "wo.restoreDose", "CL2 DOSING FAULT");

    // Counters.
    const dtH = TICK_MS / 3_600_000;
    w.counters.litresTreated += FLOW_LPH * dtH;
    if (snap.release.state === "HOLD") {
      w.counters.holdLitresPrevented += FLOW_LPH * dtH;
    } else if (snap.release.state !== "MAINTENANCE") {
      w.counters.litresCertifiedSafe += FLOW_LPH * dtH;
    }
    const feed = w.feedTurbidity;
    const outletReading = snap.live.find((r) => r.code === "TURBIDITY");
    if (!outletReading) throw new Error("sim produced no TURBIDITY reading");
    w.counters.contaminantGramsRemoved += Math.max(0, feed - outletReading.value) * FLOW_LPH * dtH * 0.001;
    w.counters.energyKwh += 1.1 * dtH;
    if (w.tick % 300 === 0 || w.removalEfficiency < 0.4) {
      if (w.tick % 300 === 0) {
        w.backwashes += 1;
        w.counters.rejectLitres += 800;
      }
    }
    w.treatedKL += (FLOW_LPH * dtH) / 1000;
    if (w.adaptiveEngaged) w.adaptiveKL += (FLOW_LPH * dtH) / 1000;
    w.lampHours += dtH;
    if (w.chlorineDoseOk) w.dosePct = Math.max(0, w.dosePct - 0.0004);

    return snap;
  }

  private reading(code: ParameterCode, value: number, sensorId: string): LiveReading {
    const w = this.w;
    if (w.frozenSensor === code) value = w.frozenValue;
    const r: LiveReading = { code, value, at: w.epoch, sensorId };
    const h = (w.history[sensorId] ??= []);
    h.push(r);
    if (h.length > 60) h.shift();
    return r;
  }

  private buildSnapshot(): PlantSnapshot {
    const w = this.w;
    const n = (a: number) => noise(this.rng, a);
    const eff = w.removalEfficiency;

    // Transfer pipeline.
    const turbIn = w.feedTurbidity + n(w.feedTurbidity * 0.04);
    const turbPre = turbIn * 0.55;
    const turbMedia = turbPre * (1 - 0.85 * eff);
    const turbCarbon = turbMedia * 0.92;
    const turbOut = Math.max(0.05, turbCarbon + n(0.03));

    const tdsOut = w.adaptiveEngaged ? w.feedTds * 0.45 : w.feedTds * 0.97;
    const phOut = w.feedPh + n(0.06);
    const tempOut = w.feedTemp + n(0.4);
    const cl2 = w.chlorineDoseOk ? 0.45 + n(0.07) : 0.04 + n(0.01);
    const deltaP = eff > 0.5 ? 0.42 + n(0.05) : eff > 0.15 ? 1.1 + n(0.1) : 1.85 + n(0.1);

    const live: LiveReading[] = [
      this.reading("PH", +phOut.toFixed(2), "S-PH"),
      this.reading("TURBIDITY", +turbOut.toFixed(2), "S-TURB"),
      this.reading("TDS", Math.round(tdsOut + n(8)), "S-TDS"),
      this.reading("TEMPERATURE", +tempOut.toFixed(1), "S-TEMP"),
      this.reading("CHLORINE", +cl2.toFixed(2), "S-CL2"),
    ];

    const sensorDefs: SensorDef[] = SENSORS.map((s) => {
      let age = CAL_AGE_DAYS[s.sensorId];
      if (this.scenarioId === "SENSOR_DRIFT" && s.parameter === "PH") age = 13;
      return {
        sensorId: s.sensorId,
        parameter: s.parameter,
        lastCalibratedAt: EPOCH0 - age * 86_400_000,
      };
    });

    const trust = sensorDefs.map((d) =>
      computeTrust(d, w.history[d.sensorId] ?? [], w.epoch, w.contradictionSensor === d.parameter)
    );

    const src = SOURCE_PROFILES[SCENARIOS[this.scenarioId].sourceProfile];
    const assets = ASSET_DEFS.map((d) =>
      computeAssetHealth(
        d,
        d.assetId === "ADAPTIVE_MEDIA" ? w.adaptiveKL : w.treatedKL,
        src.loadFactor,
        w.backwashes,
        {
        lampHours: w.lampHours,
        lampRatedHours: 9000,
        dosePct: w.dosePct,
      })
    );
    if (this.scenarioId === "FILTER_FAILURE") {
      const m = assets.find((a) => a.assetId === "MEDIA_FE_MN");
      if (m) m.remainingFraction = Math.max(0.02, m.remainingFraction - Math.min(0.9, w.tick * 0.02));
    }

    const release = decideRelease({
      now: w.epoch,
      live,
      labEvidence: w.labReports,
      trust,
      assets,
      maintenanceHold: w.maintenanceHold,
      requiredEvidence: src.requiredEvidence,
    });
    w.releaseTape.push(release.state);
    if (w.releaseTape.length > 48) w.releaseTape.shift();

    const fault = (id: string) =>
      (id === "DISINFECTION" && (!w.chlorineDoseOk || !w.uvOk)) ||
      (id === "FE_MN_MEDIA" && eff < 0.4);

    const stages: StageState[] = STAGES.map((s) => {
      const metrics: { label: string; value: string }[] = [];
      if (s.id === "INTAKE") {
        metrics.push({ label: "FLOW", value: `${FLOW_LPH} LPH` });
        metrics.push({ label: "TURB IN", value: `${turbIn.toFixed(1)} NTU` });
      } else if (s.id === "PRETREAT") {
        metrics.push({ label: "TURB OUT", value: `${turbPre.toFixed(1)} NTU` });
      } else if (s.id === "FE_MN_MEDIA") {
        metrics.push({ label: "REMOVAL", value: `${Math.round(eff * 100)}%` });
        metrics.push({ label: "ΔP", value: `${deltaP.toFixed(2)} BAR` });
      } else if (s.id === "CARBON") {
        metrics.push({ label: "TURB OUT", value: `${turbCarbon.toFixed(2)} NTU` });
      } else if (s.id === "ADAPTIVE") {
        metrics.push({ label: "MODE", value: w.adaptiveEngaged ? "ENGAGED" : "BYPASS" });
        metrics.push({ label: "TDS OUT", value: `${Math.round(tdsOut)} MG/L` });
      } else if (s.id === "DISINFECTION") {
        metrics.push({ label: "UV", value: w.uvOk ? "ON" : "FAULT" });
        metrics.push({ label: "CL2", value: `${cl2.toFixed(2)} MG/L` });
      } else if (s.id === "OUTLET") {
        metrics.push({ label: "TURB", value: `${turbOut.toFixed(2)} NTU` });
        metrics.push({ label: "VALVE", value: release.state === "HOLD" || release.state === "MAINTENANCE" ? "LOCKED" : "OPEN" });
      }
      return {
        id: s.id,
        name: s.i18nKey,
        active: true,
        fault: fault(s.id),
        metrics,
      };
    });

    return {
      at: w.epoch,
      scenario: this.scenarioId,
      sourceProfile: src.id,
      live,
      series: SENSORS.map((s) => ({
        code: s.parameter,
        sensorId: s.sensorId,
        values: (w.history[s.sensorId] ?? []).slice(-24).map((r) => r.value),
      })),
      releaseTape: [...w.releaseTape],
      labEvidence: [...w.labReports].sort((a, b) => b.reportedAt - a.reportedAt),
      trust,
      assets,
      stages,
      release,
      connectivity: {
        online: !w.offline,
        lastSyncAt: w.offline ? w.lastSyncAt : w.epoch,
        queuedEvents: w.queued,
      },
      counters: { ...w.counters },
      workOrders: w.workOrders.map((o) => ({ ...o, status: w.woStatus[o.id] ?? o.status })),
      incidents: w.incidents.map((i) => ({ ...i, acknowledged: w.acknowledged.includes(i.id) })),
      flowLph: FLOW_LPH,
    };
  }
}

