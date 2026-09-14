# NEER//OS — Product Blueprint

> **SIH26040** · Smart Water Purification and Quality Monitoring System for Rural and Mining-Affected Areas
> Government of Jharkhand · Department of Higher & Technical Education · Clean & Green Technology (Hardware)

---

## 1. Problem Statement (as issued)

Rural and mining-affected regions of Jharkhand depend on groundwater and surface sources contaminated by suspended particles, excessive minerals, microbial impurities, and mining-related pollutants. There is no real-time water quality monitoring, so communities cannot judge safety or act in time. The problem statement asks for an affordable, portable, energy-efficient system that **monitors** pH, turbidity, TDS and temperature, **purifies** through a multi-stage process, and **alerts** on unsafe conditions.

## 2. The honest observation

SIH26040 is a **hardware problem statement**. A dashboard alone — a web page showing pH and TDS gauges — is the weakest possible answer: it is what every team will build, and it is what Jharkhand already has (Jhar-Jal / Jal Jeevan Mission asset and water-quality dashboards already exist).

Three facts shape everything that follows:

1. **Cheap sensors cannot see the contaminants that matter most.** pH, turbidity, TDS and temperature are *proxies*. Iron, fluoride, arsenic, manganese and pathogens — the actual hazards in Jharkhand's mining belt — need periodic lab confirmation. Any product that claims to "detect heavy metals" from a ₹400 TDS probe is lying, and judges in a hardware track will know it.
2. **Labs are the bottleneck, not the sensor.** District water-testing labs have limited throughput; results come back days later. Safety decisions must reason about *evidence freshness*, not just values.
3. **The hard engineering problem is the control loop, not the chart.** What does the plant *do* when a proxy reading is unsafe, stale, or contradicts the last lab report? That decision — release water or hold it — is where public health is won or lost.

## 3. Product concept

**NEER//OS** — *neer* (नीर), Hindi for water — is an **operational digital twin for decentralized purification plants**: a "water operating system" that sits between the physical treatment train and the people who depend on it.

It combines four evidence streams into one explainable release decision:

| Stream | Cadence | Examples |
|---|---|---|
| Live process telemetry | Seconds–minutes | pH, turbidity, TDS, temperature, flow, chlorine residual, differential pressure |
| Dated lab evidence | Days–weeks | Iron, fluoride, arsenic, manganese, coliforms — confirmed by NABL/district lab |
| Sensor trust state | Continuous | Calibration age, drift detection, cross-sensor contradiction |
| Asset state | Continuous | Filter media remaining-useful-life, UV lamp hours, dosing stock |

**Core claim:** NEER//OS produces an *explainable, standards-aware release decision* — "this water may be released because / must be held because" — citing the specific evidence, thresholds and staleness behind every call.

**Core non-claim:** it does not pretend to detect every contaminant automatically, and it never silently overrides a lab result.

## 4. Users

| Persona | Need | Primary surfaces |
|---|---|---|
| **Plant operator** (village-level, often semi-technical) | "Is the water safe to release right now, and what do I do if not?" | Shift overview, process twin, incidents, maintenance |
| **Community resident** | "Is the water safe today? Why was the supply held yesterday?" | Public status strip on pitch/community view |
| **District authority (JJM/block official)** | "Which plants are compliant, which are locked, what is the trend?" | Impact, quality evidence, plant status |
| **Technician / NGO partner** | "What is failing, what needs calibration or media replacement?" | Maintenance, sensor trust, filter health |

## 5. The modelled physical plant

The prototype models a credible treatment train for a ~500–2,000 LPH community plant serving iron/fluoride-affected Jharkhand groundwater. This is a **documented reference design**, not a claim of built hardware.

```
RAW INTAKE → PRE-TREAT → OXIDATION + Fe/Mn MEDIA → ACTIVATED CARBON
→ (source-adaptive: RO skid / fluoride media when lab evidence demands)
→ DISINFECTION (UV + chlorination) → OUTLET VERIFICATION → RELEASE VALVE
                                                              ↘ hold → reject/recirculate
```

**Treatment stages in the twin:**

1. **Intake & source classification** — source profile (borewell / surface / mine-affected) sets the expected contaminant signature and treatment recipe.
2. **Pre-treatment** — screen + sedimentation/clarifier; protects downstream media.
3. **Aeration + catalytic media** — oxidation/filtration for iron & manganese (the dominant Jharkhand groundwater problem).
4. **Activated carbon** — organics, taste, odour, residual oxidant trim.
5. **Source-adaptive stage** — activated alumina / RO for fluoride or mining signatures, engaged when lab evidence requires it (modelled, not always-on).
6. **Disinfection** — UV dose + residual chlorine to BIS norms.
7. **Outlet verification** — the release gate. A motorized valve + community tap status.

**Sludge/waste:** media backwash and reject streams are tracked as operational events (backwash cycles, waste volume) — rural deployment must account for where contaminants *go*, not just that they were removed.

## 6. Standards model — BIS IS 10500

All thresholds are anchored to **BIS IS 10500:2012** drinking-water specification, distinguishing **acceptable limit** from **permissible limit in absence of alternate source** — the difference between "advise" and "only if no other source."

| Parameter | Unit | Acceptable | Permissible | Sensing |
|---|---|---|---|---|
| pH | — | 6.5–8.5 | no relaxation | live probe |
| Turbidity | NTU | 1 | 5 | live probe |
| TDS | mg/L | 500 | 2000 | live probe |
| Residual free chlorine | mg/L | 0.2 | 1.0 | live probe (modelled) |
| Iron (Fe) | mg/L | 1.0 | no relaxation | **lab only** |
| Fluoride (F⁻) | mg/L | 1.0 | 1.5 | **lab only** |
| Arsenic (As) | mg/L | 0.01 | no relaxation | **lab only** |
| Manganese (Mn) | mg/L | 0.1 | 0.3 | **lab only** |
| Total coliform | — | absent/100mL | not applicable | **lab only** |
| Nitrate | mg/L | 45 | no relaxation | lab only |
| Temperature | °C | — (context) | — | live probe |

The product treats "sensing" as a first-class column: live probes produce *proxies*; lab-confirmed parameters carry a **date and a freshness horizon**. When lab evidence is stale beyond its horizon, the twin downgrades confidence and may restrict release to "conditional" status — it never fabricates a current value.

## 7. The release decision — explainable safety interlock

The heart of NEER//OS is a deterministic, fully explainable rule engine. Every release state is one of:

- **`SAFE`** — all live proxies in acceptable range AND lab evidence in-date AND sensors trustworthy AND disinfection verified.
- **`CONDITIONAL`** — one or more parameters between acceptable and permissible limits, or lab evidence nearing staleness, or a non-critical sensor degraded. Water releases with a stated caveat.
- **`HOLD`** — any parameter over permissible limit, or lab evidence shows a confirmed exceedance, or required evidence is missing/stale, or sensor trust is too low to certify. Release valve locked; reason chain shown.
- **`MAINTENANCE`** — an operator-placed service state; release locked regardless of readings.

Every decision emits a **reason chain** — an ordered, human-readable list of the rules that fired, each citing parameter, value, threshold and evidence date. Nothing is a black box; an operator or judge can click "why" and get the exact clause, in English or Hindi.

This is deliberately a **hybrid**: hard safety interlocks are deterministic rules (auditable, standards-mapped); supporting scores (anomaly likelihood, filter health, sensor trust) are transparent weighted heuristics with shown inputs — not opaque ML claims.

## 8. Sensor trust & calibration

Sensors lie. NEER//OS models trust as a score, not a boolean:

- **Calibration age** — days since last calibration vs. interval; decaying trust.
- **Cross-validation** — contradictory readings (e.g., outlet turbidity higher than intake with all stages healthy) flag suspect sensors.
- **Drift detection** — a frozen or slowly-drifting reading in a dynamic process lowers trust.
- **Lab reconciliation** — when a lab report contradicts what proxies implied, trust is debited and the event is logged.

Low trust doesn't just warn — it feeds the interlock: a release certification made by an untrusted sensor is worth less, and below a threshold the plant cannot certify `SAFE` at all (fail-safe toward `HOLD`).

## 9. Maintenance & filter health

- **Filter/media remaining-useful-life** as a transparent score: rated bed-life consumed by throughput volume, feed-load severity and backwash count — inputs shown, not hidden in a model.
- **UV lamp hours**, **dosing stock** (hypochlorite/oxidant), **backwash due** as scheduled/maintenance triggers.
- **Work orders**: technician-facing task list with parts, due reason, and a bilingual maintenance log.

## 10. Deterministic demo scenarios

The prototype ships five seeded, reproducible scenarios (no live hardware required):

| Scenario | Story it proves |
|---|---|
| `SAFE_BASELINE` | Normal day: borewell source, all evidence in-date, release open. |
| `MINE_RUNOFF` | Lab report returns iron/manganese exceedance after rain → conditional→hold logic, adaptive stage engagement, resident notice. |
| `MICROBIAL_RISK` | Chlorine residual drops + lab coliform detect → immediate hold, shock-dose response workflow. |
| `SENSOR_DRIFT` | pH probe drifts/freeze; cross-checks flag it → trust decays → cannot certify safe → calibration work order. |
| `FILTER_FAILURE` | Media RUL collapses / differential pressure spikes → breakthrough risk → maintenance state + work order. |

Scenarios are deterministic seeds: same seed, same event stream — a judge can replay exactly what a reviewer saw.

## 11. Offline & deployment posture

Rural plants lose connectivity routinely. The prototype therefore ships:

- **Offline-resilient shell** — the app works without network (all data is local/seeded); a visible `CONNECTIVITY` / `SYNC` status strip shows last-sync age and queued events.
- **Local persistence** — operator actions (acknowledgements, work-order state, lab report entry) persist in the browser via a typed storage boundary, so the demo survives reloads but resets deterministically.
- **Repository boundaries** — all data access goes through typed repository interfaces (`TelemetryRepository`, `LabEvidenceRepository`, `WorkOrderRepository`, …) backed today by a seeded local implementation, shaped exactly as a real backend/edge-gateway integration would consume them.

## 12. Impact accounting

The impact surface quantifies the three value axes with honest, labelled estimates:

- **Health/social** — litres of certified-safe water delivered, person-days of safe supply, hold events that prevented exposure.
- **Economic** — estimated cost per litre vs. bottled/tanker alternatives; avoided illness cost framing (labelled as estimate).
- **Environmental** — contaminants intercepted (mass of Fe/Mn/media load treated), reject/backwash volume managed, energy per litre.

## 13. Differentiation vs. existing JJM/Jhar-Jal dashboards

| Existing systems | NEER//OS |
|---|---|
| Asset registry + periodic water quality entry | Closed-loop digital twin of the *treatment process itself* |
| Shows what a lab reported | Reasons about what the plant should *do* about it |
| Retrospective compliance | Live explainable release interlock |
| Trusts readings | Models sensor trust, staleness and contradiction |
| Cloud-first | Offline-resilient field operation |
| Reports outputs | Accounts for health, economic, environmental impact |

## 14. Scope honesty

- The Next.js app is a **software prototype/digital twin** of the proposed system; the physical BOM and train are documented designs, not fabricated claims of built hardware.
- All telemetry is **deterministic seeded simulation**; lab evidence is **user-entered/seeded**, dated, and freshness-tracked.
- "AI" is deliberately scoped: explainable rules + transparent scoring. No claimed pathogen or heavy-metal detection from proxy sensors.
