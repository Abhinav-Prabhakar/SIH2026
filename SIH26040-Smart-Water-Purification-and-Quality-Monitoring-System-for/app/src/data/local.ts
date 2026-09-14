// Local persistence: scenario choice, sim tick, and operator overlay
// actions survive reloads. Reset restores the deterministic baseline.
// No swallowed errors — storage failures throw and surface.

import { ScenarioId } from "@/domain/types";
import { OverlayEvent } from "@/sim/engine";

const KEY = "neeros.demo.v1";

export interface PersistedDemo {
  scenarioId: ScenarioId;
  tick: number;
  overlay: OverlayEvent[];
}

export function loadPersisted(): PersistedDemo | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  const p = JSON.parse(raw) as PersistedDemo;
  if (!p.scenarioId || typeof p.tick !== "number" || !Array.isArray(p.overlay)) {
    throw new Error(`corrupt persisted demo state: ${raw.slice(0, 120)}`);
  }
  return p;
}

export function persist(p: PersistedDemo): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

const PREF_KEY = "neeros.prefs.v1";

export interface Prefs {
  lang: "en" | "hi";
  theme: "dark" | "light" | "system";
}

export function loadPrefs(): Prefs | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PREF_KEY);
  if (!raw) return null;
  const p = JSON.parse(raw) as Prefs;
  if (p.lang !== "en" && p.lang !== "hi") throw new Error(`bad lang pref: ${p.lang}`);
  if (p.theme !== "dark" && p.theme !== "light" && p.theme !== "system")
    throw new Error(`bad theme pref: ${p.theme}`);
  return p;
}

export function persistPrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREF_KEY, JSON.stringify(p));
}
