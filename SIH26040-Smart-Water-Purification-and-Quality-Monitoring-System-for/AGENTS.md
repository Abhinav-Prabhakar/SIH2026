# SIH26040 — NEER//OS

Explainable operational digital twin for decentralized water purification plants. SIH26040, Govt. of Jharkhand, Clean & Green Technology (Hardware).

## Layout

- `SIH26040.md` — original problem statement (do not edit)
- `docs/product-blueprint.md` — concept, users, plant model, BIS IS 10500 model, interlock, scenarios
- `docs/ux-specification.md` — per-screen UX spec; Nothing design system is binding
- `docs/technical.md` — engine internals, data model, reference BOM, repo boundaries
- `nothing-design/` — the design system source of truth for ALL UI
- `app/` — Next.js + TypeScript + Tailwind prototype

## Commands (from `app/`)

```bash
npm install
npm run dev        # dev server
npm test           # vitest: scenario/interlock/determinism
npm run typecheck  # tsc --noEmit
npm run lint       # eslint flat config (eslint-config-next)
npm run build      # production build — must pass before commit
```

## Hard rules

- **Nothing design system is binding** for every component (`nothing-design/`). No shadows, gradients-in-chrome, skeletons, toasts, zebra striping, filled icons, or spring easing. Status color on values only; ≤1 red accent per screen.
- **Claim honesty:** live sensors produce proxies only (pH, turbidity, TDS, temperature, chlorine). Heavy metals/pathogens are lab-confirmed, dated, freshness-tracked. Never present seeded sim data as real telemetry. No unscoped "AI" claims — the engine is explainable rules + transparent scoring.
- **Determinism:** `src/sim/` must stay seed-deterministic (no `Date.now()`, no unseeded random). Scenario events use sim epoch.
- **Tests must pass** for scenario release states before shipping changes to `src/domain/` or `src/sim/`.
- Never commit `.DS_Store`, `node_modules/`, `.next/` (covered by `.gitignore`).
