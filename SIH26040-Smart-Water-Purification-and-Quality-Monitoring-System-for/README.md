# NEER//OS

**An explainable operational digital twin for decentralized water purification plants.**

> SIH26040 — Smart Water Purification and Quality Monitoring System for Rural and Mining-Affected Areas
> Government of Jharkhand · Dept. of Higher & Technical Education · Clean & Green Technology (Hardware)

---

## The problem

Jharkhand's rural and mining-affected communities drink from sources contaminated by iron, fluoride, manganese, arsenic and microbial load. Existing dashboards (Jhar-Jal / JJM) record what a lab eventually reported. Nobody answers the question that actually protects public health:

**"Given everything we know right now — live readings, dated lab evidence, sensor health — may this water be released, and why?"**

## The answer

NEER//OS is a "water operating system" for community-scale purification plants. It models the physical treatment train, fuses live proxy telemetry with dated lab-confirmed evidence, tracks how much each sensor can be trusted, and produces an **explainable release decision** — `SAFE`, `CONDITIONAL`, `HOLD`, or `MAINTENANCE` — with the exact rule, threshold and evidence date behind every call, in English and Hindi.

## What makes it different

- **It reasons, it doesn't just display.** A deterministic, standards-mapped interlock engine (BIS IS 10500, acceptable vs. permissible limits) drives the release valve. Every decision ships its reason chain — click *why*, get the clause.
- **It's honest about evidence.** Cheap probes measure proxies (pH, turbidity, TDS, temperature, chlorine). Heavy metals and pathogens are *lab-confirmed*, dated, and freshness-tracked. Stale or contradictory evidence degrades the release state — the system fails safe, never fabricates.
- **It doesn't trust its own sensors.** Calibration age, drift and cross-sensor contradiction feed a trust score that gates certification.
- **It closes the loop on maintenance.** Filter remaining-useful-life, UV lamp hours and dosing stock become work orders, not surprises.
- **It works where it's deployed.** Offline-resilient shell, visible sync state, field-operator mobile experience.
- **It accounts for impact.** Litres of certified-safe water, exposure prevented, cost per litre, contaminant mass intercepted.

## The prototype

A Next.js + TypeScript application implementing the full twin against **deterministic seeded scenarios** — no hardware required to evaluate every behavior, and a judge can replay the exact event stream a reviewer saw.

**Five scenarios:** safe baseline · mine-runoff (Fe/Mn exceedance) · microbial-risk event · sensor drift · filter failure.

### Run it

```bash
cd app
npm install
npm run dev        # http://localhost:3000
npm test           # domain engine tests
npm run build      # production build
```

### Routes

| Route | Purpose |
|---|---|
| `/` | Judge-facing product story wired to the live twin |
| `/plant` | Operator shift overview + release state |
| `/plant/twin` | Treatment-train digital twin |
| `/plant/quality` | Quality evidence ledger (live vs. lab) |
| `/plant/incidents` | Interlock reason chains + response |
| `/plant/maintenance` | Asset health + work orders |
| `/plant/impact` | Health / economic / environmental accounting |
| `/demo` | Scenario control & deterministic replay |

## Architecture in one paragraph

Deterministic seeded simulation → typed domain engine (standards table, evidence freshness, trust scoring, interlock reason chains) → repository interfaces (local impl today, backend/edge-gateway impl tomorrow) → React UI built strictly on the Nothing design system (Doto / Space Grotesk / Space Mono, OLED dark + paper light, monochrome hierarchy with status color on values only).

## Scope honesty

- Software prototype of the proposed system; physical plant is a documented reference design (BOM in `docs/technical.md`), not a claim of built hardware.
- All telemetry is seeded simulation; lab reports are dated, user-entered or seeded evidence.
- No claim of detecting heavy metals or pathogens from proxy sensors; "AI" is scoped to explainable rules + transparent scoring.

## Documentation

- [`docs/product-blueprint.md`](docs/product-blueprint.md) — problem analysis, concept, users, plant model, standards, interlock, scenarios, impact
- [`docs/ux-specification.md`](docs/ux-specification.md) — Nothing-design application per screen, components, states, responsive, localization
- [`docs/technical.md`](docs/technical.md) — engine internals, data model, BOM/reference design, repository boundaries, testing
- [`SIH26040.md`](SIH26040.md) — original problem statement

## Design system

All UI follows the bundled [`nothing-design/`](nothing-design/SKILL.md) system: subtractive Swiss/industrial composition, OLED-black + warm-paper modes, dot-matrix display moments, status color reserved for data values.
