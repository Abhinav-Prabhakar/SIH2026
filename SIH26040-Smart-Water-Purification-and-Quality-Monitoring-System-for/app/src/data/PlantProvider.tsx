"use client";

// PlantProvider: owns the seeded sim, ticks it on an interval, exposes the
// snapshot + operator actions + prefs (lang/theme) through one context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LabReport, PlantSnapshot, ScenarioId, WorkOrderStatus } from "@/domain/types";
import { translate, Lang, I18nKey } from "@/i18n";
import { OverlayEvent, PlantSim } from "@/sim/engine";
import {
  clearPersisted,
  loadPersisted,
  loadPrefs,
  persist,
  persistPrefs,
  Prefs,
} from "./local";

const MAX_RESTORE_TICKS = 4000;
const TICK_INTERVAL_MS = 1400;

interface PlantContextValue {
  snapshot: PlantSnapshot | null;
  tick: number;
  scenario: ScenarioId;
  eventLog: { tick: number; i18nKey: string }[];
  lang: Lang;
  theme: Prefs["theme"];
  t: (key: I18nKey | string) => string;
  selectScenario: (id: ScenarioId) => void;
  resetDemo: () => void;
  submitLabReport: (r: Omit<LabReport, "id" | "reportedAt">) => void;
  setWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  acknowledgeIncident: (id: string) => void;
  setMaintenanceHold: (hold: boolean) => void;
  setLang: (l: Lang) => void;
  setTheme: (th: Prefs["theme"]) => void;
}

const Ctx = createContext<PlantContextValue | null>(null);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const simRef = useRef<PlantSim | null>(null);
  const [snapshot, setSnapshot] = useState<PlantSnapshot | null>(null);
  const [tick, setTick] = useState(0);
  const [eventLog, setEventLog] = useState<{ tick: number; i18nKey: string }[]>([]);
  const [scenario, setScenario] = useState<ScenarioId>("SAFE_BASELINE");
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Prefs["theme"]>("system");
  const labSeq = useRef(0);

  const publish = useCallback((sim: PlantSim) => {
    setSnapshot(sim.step());
    setTick(sim.tick);
    setEventLog([...sim.eventLog]);
    persist({ scenarioId: sim.scenarioId, tick: sim.tick, overlay: sim.getOverlay() });
  }, []);

  const rebuild = useCallback(
    (scenarioId: ScenarioId, overlay: OverlayEvent[], toTick: number) => {
      const sim = new PlantSim(scenarioId, overlay, toTick);
      simRef.current = sim;
      setScenario(scenarioId);
      publish(sim);
    },
    [publish]
  );

  // Boot: restore prefs + persisted demo state. Deferred — reading
  // localStorage is an external-system sync, not a render-time value.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const prefs = loadPrefs();
      if (prefs) {
        setLangState(prefs.lang);
        setThemeState(prefs.theme);
      }
      const saved = loadPersisted();
      if (saved) {
        rebuild(saved.scenarioId, saved.overlay, Math.min(saved.tick, MAX_RESTORE_TICKS));
      } else {
        rebuild("SAFE_BASELINE", [], 0);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [rebuild]);

  // Ticker — always running; guards on simRef so order doesn't matter.
  useEffect(() => {
    const id = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      publish(sim);
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [publish]);

  // Theme: resolve + apply to <html data-theme>.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      delete root.dataset.theme;
      return;
    }
    root.dataset.theme = theme;
  }, [theme]);

  const t = useCallback((key: I18nKey | string) => translate(lang, key), [lang]);

  const selectScenario = useCallback(
    (id: ScenarioId) => rebuild(id, [], 0),
    [rebuild]
  );

  const resetDemo = useCallback(() => {
    clearPersisted();
    rebuild("SAFE_BASELINE", [], 0);
  }, [rebuild]);

  const submitLabReport = useCallback(
    (r: Omit<LabReport, "id" | "reportedAt">) => {
      const sim = simRef.current;
      if (!sim) return;
      labSeq.current += 1;
      sim.addLabReport({ ...r, id: `L-USER-${labSeq.current}`, reportedAt: 0 });
      publish(sim);
    },
    [publish]
  );

  const setWorkOrderStatus = useCallback(
    (id: string, status: WorkOrderStatus) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.setWorkOrderStatus(id, status);
      publish(sim);
    },
    [publish]
  );

  const acknowledgeIncident = useCallback(
    (id: string) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.acknowledgeIncident(id);
      publish(sim);
    },
    [publish]
  );

  const setMaintenanceHold = useCallback(
    (hold: boolean) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.setMaintenanceHold(hold);
      publish(sim);
    },
    [publish]
  );

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persistPrefs({ lang: l, theme: loadPrefs()?.theme ?? "system" });
  }, []);

  const setTheme = useCallback((th: Prefs["theme"]) => {
    setThemeState(th);
    persistPrefs({ lang: loadPrefs()?.lang ?? "en", theme: th });
  }, []);

  const value = useMemo<PlantContextValue>(
    () => ({
      snapshot,
      tick,
      scenario,
      eventLog,
      lang,
      theme,
      t,
      selectScenario,
      resetDemo,
      submitLabReport,
      setWorkOrderStatus,
      acknowledgeIncident,
      setMaintenanceHold,
      setLang,
      setTheme,
    }),
    [
      snapshot,
      tick,
      scenario,
      eventLog,
      lang,
      theme,
      t,
      selectScenario,
      resetDemo,
      submitLabReport,
      setWorkOrderStatus,
      acknowledgeIncident,
      setMaintenanceHold,
      setLang,
      setTheme,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlant(): PlantContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlant must be used inside PlantProvider");
  return v;
}
