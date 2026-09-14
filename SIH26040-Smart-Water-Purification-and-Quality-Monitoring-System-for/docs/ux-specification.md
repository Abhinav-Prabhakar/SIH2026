# NEER//OS — UX Specification

Binding design source: `nothing-design/` (SKILL.md + references). Every component in this document is an application of that system — tokens, craft rules and anti-patterns included. Where this spec and the Nothing system conflict, the Nothing system wins.

---

## 1. Design declarations (required up front)

- **Fonts (loaded via `next/font/google`):** `Doto` (display moments only, ≥36px), `Space Grotesk` (body/UI, 300–500), `Space Mono` (data, labels, ALL CAPS instrument labels).
- **Color mode:** system-first (`prefers-color-scheme`) dark/light with a manual toggle persisted per user. Dark = OLED instrument panel (`#000` canvas); light = printed technical manual (`#F5F5F5` paper, `#FFF` cards). Both modes are designed, not derived.
- **Accent discipline:** Nothing red `#D71921` appears at most once per screen as a UI element — reserved for release `HOLD` / urgent interlock states. Water-safety status colors (`success #4A9E5C`, `warning #D4A843`) are data-encoding only, applied to values.
- **Grid:** 8px spacing base; 12-col desktop shell, single-column mobile with bottom navigation.

## 2. Hierarchy contract (three-layer rule)

Every screen declares exactly three layers:

| Layer | Content | Treatment |
|---|---|---|
| **Primary** | The ONE thing — release state, a hero metric, the plant diagram | Doto ≥48px or Space Grotesk display; 48–96px breathing room |
| **Secondary** | Supporting context — the reason chain, key parameters | Space Grotesk body/subheading, grouped tight (8–16px) to primary |
| **Tertiary** | Metadata — timestamps, sync state, units, nav | Space Mono ALL CAPS `--label`/`--caption`, pushed to edges |

Squint test: the release state must be readable at arm's length on every operational screen.

## 3. Information architecture

| Route | Name | Persona focus | Primary layer |
|---|---|---|---|
| `/` | Pitch / story | Judge | Product thesis + live release state |
| `/plant` | Shift overview | Operator | Release state + what to do next |
| `/plant/twin` | Process digital twin | Operator | Treatment-train diagram with live values |
| `/plant/quality` | Quality evidence | Operator + authority | Parameter ledger: live vs lab |
| `/plant/incidents` | Incidents & response | Operator | Active reason chains + response checklist |
| `/plant/maintenance` | Maintenance | Technician | Filter/sensor health + work orders |
| `/plant/impact` | Impact | Authority | Delivered-safe-water accounting |
| `/demo` | Scenario control | Judge | Scenario picker + deterministic replay |

Navigation: desktop = Space Mono ALL CAPS text bar (`[ PITCH ]  PLANT  TWIN  QUALITY  INCIDENTS  MAINT  IMPACT  DEMO`); mobile = bottom bar, icon + label, active = `--text-display` + accent dot.

## 4. Signature components

All components reuse Nothing primitives (§ components.md). Application-specific instances:

### 4.1 Release state banner (the hero)
- **Primary:** `RELEASE: SAFE | CONDITIONAL | HOLD | MAINTENANCE` in Doto 48–72px; `HOLD` renders in `--accent` (the screen's one red moment); `SAFE` in `--success` as data value; `CONDITIONAL` in `--warning`.
- **Secondary:** first 1–2 reason-chain clauses, Space Grotesk `--body`.
- **Tertiary:** Space Mono caps — `BIS IS 10500 · EVIDENCE AGE · LAST SYNC` pushed to edges.
- Never boxed in a card — floats on the canvas (container rule: lightest tool that works).

### 4.2 Reason chain ("WHY" disclosure)
- Ordered list of fired rules: `▸ FE 2.4 MG/L > PERMISSIBLE 1.0 — LAB RPT 09 SEP (5D AGO)` — Space Mono data, `--caption`.
- Each row: rule code chip (technical 4px radius) + clause + evidence date. Expandable to full chain.

### 4.3 Parameter ledger (quality screen)
- Nothing table spec: header `--label` caps + `--border-visible` bottom; Space Mono numerals right-aligned; no zebra.
- Columns: `PARAMETER · LIVE/LAB · VALUE · ACCEPTABLE · PERMISSIBLE · EVIDENCE AGE · STATUS`. Status = colored value text only.
- Lab-only parameters show `—` in live column and a dated evidence chip — visibly honest about what sensors can't see.

### 4.4 Segmented progress (the signature viz)
- Used for: filter/media RUL, chlorine residual vs band, calibration age, lab-evidence freshness, impact goals.
- Discrete square segments, 2px gaps, status-color fill; always paired with numeric readout.

### 4.5 Process twin diagram
- Linear train: stage blocks (technical 4px corners, `--surface` + `--border`) connected by 1.5px monoline flow.
- Each stage: Space Mono caps name + live value(s) + status-colored value. Stage under fault carries the one accent moment.
- SVG/line icons at 1.5px stroke only; water path = solid line, reject/backwash = dotted pattern (pattern before color).

### 4.6 Connectivity / sync strip
- Fixed tertiary strip: `[ ONLINE · SYNCED 12S AGO ]` / `[ OFFLINE · 3 EVENTS QUEUED ]` — Space Mono caption, `--text-secondary`. Offline state gets a `--warning` value, never a banner.

### 4.7 Scenario control (demo page)
- Segmented control (max 5 → horizontal scroll of chips) for scenario selection; deterministic seed readout; `RESET DEMO` secondary button; event log below.

### 4.8 Inline status text (never toasts)
- `[SAVED]`, `[CALIBRATION LOGGED]`, `[ERROR: READING OUT OF RANGE]` — Space Mono caption beside the triggering control.

## 5. Per-screen composition

### `/` — Pitch (judge story)
Asymmetric, top-heavy. Hero: `NEER//OS` in Doto XL + one-line thesis. Below: the live release banner wired to the current scenario (the product *is* the demo). Sections: problem → plant model → evidence model → differentiation → impact, each led by one heavy element (hero number, segmented bar, or the twin diagram), rest in tertiary quiet. Footer: honest scope note — `SOFTWARE TWIN · SEEDED DATA · HARDWARE REFERENCE DESIGN`.

### `/plant` — Shift overview
Primary: release banner. Secondary: "next action" line (plain-language, bilingual). Grid of compact instrument widgets: flow LPH, turbidity in/out, chlorine residual, filter RUL — each a widget card (surface, 16px) with label caps + Space Mono value; one form per widget (number vs. segmented bar vs. sparkline — never same form twice in a row).

### `/plant/twin` — Digital twin
Primary: the train diagram itself. Secondary: selected stage detail panel (values, health, what it does). Tertiary: throughput + stage timestamps. Mobile: vertical stage list, same data.

### `/plant/quality` — Evidence ledger
Primary: parameter table. Secondary: lab-report entry form (underline inputs, dated) + evidence-freshness segmented bars. The page's job is to make "what we know vs. when we knew it" undeniable.

### `/plant/incidents` — Response
Primary: active interlock reason chain. Secondary: ordered response checklist (acknowledge → verify → remediate → re-test) with Space Mono status marks `[DONE]`. Resolved incidents below as quiet ledger.

### `/plant/maintenance`
Primary: worst-off asset health score (Doto % + segmented bar). Secondary: work-order list (label + due reason + part + bilingual note). Tertiary: calibration due-dates.

### `/plant/impact`
Primary: litres of certified-safe water delivered (hero Doto number + unit). Secondary: three axes — health / economic / environmental — each a different viz form (segmented bar, stat rows, dot-grid). All estimates labelled `EST.`.

### `/demo` — Scenario control
Primary: scenario selector + current state. Secondary: seeded event timeline. Tertiary: seed ID, tick counter, reset control.

## 6. States (Nothing §15 applied)

- **Loading:** `[LOADING…]` bracket text or segmented spinner — no skeletons.
- **Empty:** centered, ≥96px padding, one `--text-secondary` headline + one `--text-disabled` sentence; optional dot-grid motif.
- **Error:** `--accent` inline `[ERROR: …]` text or input border; never red fills/banners.
- **Offline:** sync strip state only — product remains usable.
- **Stale evidence:** freshness value ages to `--warning` then `--accent` — staleness is shown, not hidden.

## 7. Responsive behavior

- **Desktop (≥1024px):** 12-col shell, text-bar nav, side-by-side twin + detail.
- **Mobile (<768px):** single column, bottom nav; release banner persists as condensed top strip (`HOLD — TAP FOR WHY`); twin becomes vertical stage flow; tables collapse to label/value data rows.
- Field-operator mobile is intentional: thumb-reachable nav, 44px targets, everything readable on a 360px wide screen in sunlight (light mode first-class).

## 8. Localization

English/Hindi throughout. Pattern: Space Mono caps stays Latin instrument-style for labels; Hindi (`हिंदी`) appears in sentence-level content (next-action lines, resident notices, reason clauses). Language toggle in shell header. No auto-translation claims — copy is authored in both languages.

## 9. Motion

150–250ms ease-out (`cubic-bezier(0.25,0.1,0.25,1)`), opacity only. Scenario transitions fade data. No springs, no parallax, no scroll-jacking.

## 10. Anti-pattern audit checklist (verified before ship)

- [ ] No gradients, shadows, blur in chrome
- [ ] No skeletons, toasts, mascots, multi-paragraph empty states
- [ ] No zebra striping; dividers only
- [ ] No filled/multi-color icons; monoline 1.5px only
- [ ] Border-radius ≤16px cards, 999px pill buttons, 4px technical
- [ ] ≤1 red UI accent per screen; status color on values only
- [ ] Max 2 font families/screen (+Doto hero), 3 sizes, 2 weights
- [ ] Three hierarchy layers declared per screen
- [ ] Numbers in Space Mono; labels in caps
- [ ] Charts: 1.5–2px lines, horizontal grid only, direct labels
