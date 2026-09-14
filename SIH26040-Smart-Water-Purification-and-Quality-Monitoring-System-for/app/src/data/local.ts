// Local persistence: scenario choice, sim tick, and operator overlay
// actions survive reloads. Reset restores the deterministic baseline.

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
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedDemo;
    if (!p.scenarioId || typeof p.tick !== "number" || !Array.isArray(p.overlay)) return null;
    return p;
  } catch {
    return null;
  }
}

export function persist(p: PersistedDemo): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — demo still works in-session
  }
}

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const PREF_KEY = "neeros.prefs.v1";

export interface Prefs {
  lang: "en" | "hi";
  theme: "dark" | "light" | "system";
}

export function loadPrefs(): Prefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : null;
  } catch {
    return null;
  }
}

export function persistPrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
