# NEER//OS — Technical Deep Dive

This document is the engineering companion to `product-blueprint.md` and `ux-specification.md`. It covers the domain model, the interlock engine, the seeded simulation, repository boundaries, the reference hardware design, and the testing strategy.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript (strict) | Single deployable demo, server/client split, Vercel-target |
| Styling | Tailwind CSS + CSS custom properties | Tokens map cleanly to Nothing system; theme via `prefers-color-scheme` + class toggle |
| Fonts | `next/font/google`: Doto, Space Grotesk, Space Mono | Self-hosted at build; zero layout shift |
| Icons | Lucide (thin) | Monoline 1.5px per Nothing spec |
| Domain | Pure TypeScript modules, no framework deps | Testable, portable to an edge gateway later |
| Tests | Vitest | Deterministic engine unit tests |
| Persistence | Browser `localStorage` behind typed repos | Demo survives reload, resets deterministically |
| i18n | Authored `en`/`hi` dictionaries + `t()` | No auto-translation claims |

## 2. Domain model

```ts
type ParameterCode =
  | 'PH' | 'TURBIDITY' | 'TDS' | 'TEMPERATURE' | 'CHLORINE'   // live proxies
  | 'IRON' | 'FLUORIDE' | 'ARSENIC' | 'MANGANESE'             // lab-confirmed
  | 'NITRATE' | 'COLIFORM';                                  // lab-confirmed

interface ParameterSpec {
  code: ParameterCode;
  unit: string | null;              // null for pH/coliform presence
  acceptableMin?: number;           // BIS acceptable band
  acceptableMax?: number;
  permissibleMax?: number;          // BIS permissible limit (absent => no relaxation)
  sensing: 'LIVE' | 'LAB';
  freshnessHorizonDays?: number;    // lab evidence staleness horizon
}

interface LiveReading {
  code: ParameterCode;
  value: number;
  at: number;                       // epoch ms (simulated clock)
  sensorId: string;
}

interface LabReport {
  id: string;
  parameter: ParameterCode;
  value: number | 'DETECTED' | 'ABSENT';
  lab: string;                      // e.g. "DISTRICT WTL RANCHI"
  sampledAt: number;
  reportedAt: number;
}

type ReleaseState = 'SAFE' | 'CONDITIONAL' | 'HOLD' | 'MAINTENANCE';

interface Reason {
  code: string;                     // e.g. 'R-FE-OVER'
  parameter?: ParameterCode;
  observed?: number | string;
  threshold?: string;               // 'PERMISSIBLE 1.0 MG/L'
  evidenceAgeDays?: number;
  severity: 'BLOCK' | 'WARN' | 'INFO';
  i18nKey: string;                  // bilingual clause lookup
}

interface SensorTrust {
  sensorId: string;
  score: number;                    // 0..1
  lastCalibratedAt: number;
  flags: ('DRIFT' | 'FROZEN' | 'CONTRADICTION' | 'CAL_OVERDUE')[];
}

interface AssetHealth {
  assetId: string;                  // 'MEDIA_FE_MN' | 'CARBON' | 'UV_LAMP' | ...
  kind: 'MEDIA' | 'LAMP' | 'DOSE' | 'MEMBRANE';
  remainingFraction: number;        // 0..1
  basis: string[];                  // shown inputs: '4200 KL TREATED', '38 BACKWASHES'
}

interface PlantSnapshot {
  at: number;
  scenario: ScenarioId;
  live: LiveReading[];
  labEvidence: LabReport[];
  trust: SensorTrust[];
  assets: AssetHealth[];
  stages: StageState[];             // per-stage twin state
  release: { state: ReleaseState; reasons: Reason[] };
  connectivity: { online: boolean; lastSyncAt: number; queuedEvents: number };
  counters: ImpactCounters;         // litres certified, holds, contaminant mass, etc.
}
```

## 3. Standards engine (`standards.ts`)

Static `BIS_IS_10500` table (blueprint §6) + evaluators:

```ts
evaluateLiveParameter(spec, reading): 'OK' | 'WARN' | 'FAIL'
evaluateLabEvidence(spec, report, now): 'OK' | 'WARN' | 'FAIL' | 'STALE' | 'MISSING'
```

`WARN` = between acceptable and permissible. `FAIL` = over permissible / any exceedance on a no-relaxation parameter / coliform detected. `STALE` = evidence older than its horizon → treated as *not better than unknown* for safety-critical parameters.

## 4. Interlock engine (`interlock.ts`)

Pure function: `decideRelease(snapshot) → { state, reasons }`. Deterministic precedence:

1. `MAINTENANCE` — manual hold placed by operator (short-circuit).
2. `HOLD` if any BLOCK-severity reason exists:
   - `FAIL` on any live proxy or in-date lab parameter
   - `MISSING`/`STALE` safety-critical evidence (coliform, arsenic, fluoride where source profile requires)
   - Sensor trust on a release-critical sensor < `CERTIFY_MIN` (default 0.4)
   - Cross-sensor contradiction flag unresolved
   - Disinfection unverified (chlorine residual below minimum or UV fault)
3. `CONDITIONAL` if any WARN-severity reason: acceptable<value≤permissible, evidence near horizon, non-critical trust degraded, asset RUL < warn threshold.
4. `SAFE` otherwise.

Every emitted `Reason` carries parameter, observed value, threshold string, evidence age and i18n key — the UI renders the chain verbatim; the engine is also exercised directly by Vitest for each scenario's expected state.

## 5. Sensor trust (`trust.ts`)

`score = base(1.0) − driftPenalty − frozenPenalty − contradictionPenalty − calibrationAgePenalty`, clamped 0..1. Calibration age penalty ramps from calibration interval's end. `CONTRADICTION` raised when a live proxy implies stage performance inconsistent with adjacent stages (e.g., outlet turbidity ≥ intake while all stages report healthy). All inputs appear in `flags` so the UI can show *why* trust is low.

## 6. Filter / asset health (`maintenance.ts`)

Transparent consumption model per asset:

```
remainingFraction = 1 − (treatedKL / ratedKL) × loadFactor − backwashWear
```

`loadFactor` scales with feed severity (scenario feed index); `backwashWear` is a fixed fractional debit per cycle. Inputs rendered verbatim in the UI (`basis` array). Thresholds: `WARN` < 0.35 remaining, `BLOCK`-adjacent maintenance trigger < 0.1 → raises a work order and a CONDITIONAL/HOLD contribution via a reason code.

## 7. Simulation (`sim/`)

- **Clock:** simulated epoch advanced per tick; UI polls on an interval; everything derived — no wall-clock dependency, so replays are identical.
- **Seeded RNG:** mulberry32; scenario scripts define baseline + event injections (lab report arrival, chlorine drop, probe freeze, ΔP spike).
- **Scenario scripts:** each scenario = `{ seed, sourceProfile, baseline, events: [{ atTick, apply(state) }] }`. Events mutate the world state (inject a lab report, set a drift flag, etc.); readings then derive from world state through per-stage transfer functions with seeded noise.
- **Transfer functions:** each stage reduces/increases parameters plausibly (media stage cuts turbidity & Fe proxy; carbon trims; disinfection sets chlorine residual; a `FILTER_FAILURE` event degrades removal efficiency → breakthrough visible in outlet proxies).

## 8. Repository boundaries (`data/`)

```ts
interface TelemetryRepository { latest(): Promise<LiveReading[]>; history(code, span): Promise<LiveReading[]> }
interface LabEvidenceRepository { list(): Promise<LabReport[]>; submit(r: NewLabReport): Promise<LabReport> }
interface WorkOrderRepository { list(): Promise<WorkOrder[]>; setStatus(id, status): Promise<void> }
interface ScenarioRepository { current(): Promise<ScenarioId>; select(id): Promise<void>; reset(): Promise<void> }
```

`local/` implementations wrap the seeded sim + `localStorage` overlays (acknowledgements, lab submissions, work-order state). Swapping in a real backend = implementing the interfaces — no UI changes.

## 9. Reference hardware design (documented, not claimed)

Community plant ~1,000 LPH, solar-capable:

| Subsystem | Reference BOM (indicative) |
|---|---|
| Intake | Submersible/raw pump, strainer, elevated storage |
| Pre-treatment | Multi-grade sand filter / clarifier |
| Fe/Mn | Aeration + catalytic media vessel (e.g., MnO₂-based) |
| Polishing | Activated carbon vessel |
| Adaptive | Activated alumina (fluoride) or small RO skid (mining signature), valved bypass |
| Disinfection | UV chamber + hypochlorite dosing pump |
| Sensing | pH, turbidity, TDS/EC, temperature, ORP/chlorine (modelled), flow, differential pressure |
| Control | Industrial MCU/PLC-class controller, motorized release + reject valves, GSM/LoRa uplink |
| Power | Mains + solar hybrid, battery buffer for graceful offline operation |

NEER//OS is the control/monitoring software layer for this train. BOM is indicative for the reference design and marked as such in the UI and docs.

## 10. Testing

- **Engine tests (Vitest):** each scenario at key ticks → expected release state + expected reason codes; threshold boundary cases (value == permissible → FAIL); staleness horizon crossing; trust gating (trust < min ⇒ cannot be SAFE); maintenance override precedence.
- **Determinism test:** same seed + same ticks → identical snapshots (deep equal).
- **Build gates:** `tsc --noEmit`, `eslint`, `next build`.

## 11. Honesty boundaries in code

- `parameters.ts` marks `sensing: 'LAB'` — UI renders lab-only parameters with dated evidence chips, never synthetic "live" values.
- Simulation is namespaced (`sim/`) and labelled in UI (`SEEDED DEMO`), never presented as live hardware telemetry.
- No ML/AI terminology for the scoring functions; code and copy call them rules/heuristics.
