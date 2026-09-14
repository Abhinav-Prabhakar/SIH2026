"use client";

// Nothing-language instruments: gauges, sparklines, concentric rings,
// dot-matrix grids, tick tape, valve glyph. Monoline 1.5px, status color
// as data encoding only, always paired with a numeric readout.

import { ParameterCode, ReleaseState } from "@/domain/types";
import { Label, Value } from "./primitives";

/* ---------- shared geometry ---------- */

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const STATUS_HEX: Record<string, string> = {
  neutral: "var(--text-display)",
  good: "var(--success)",
  moderate: "var(--warning)",
  over: "var(--accent)",
};

/* ---------- Gauge: 270° instrument dial ---------- */

export function Gauge({
  label,
  value,
  unit,
  fraction,
  status = "neutral",
  ticks = 9,
  size = 96,
}: {
  label: string;
  value: string;
  unit?: string;
  fraction: number; // 0..1
  status?: keyof typeof STATUS_HEX;
  ticks?: number;
  size?: number;
}) {
  const R = 40;
  const C = 50;
  const START = -135;
  const END = 135;
  const frac = Math.max(0, Math.min(1, fraction));
  const valEnd = START + frac * (END - START);
  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label} ${value}${unit ? ` ${unit}` : ""}`}
      >
        {/* tick ring */}
        {Array.from({ length: ticks }).map((_, i) => {
          const deg = START + (i / (ticks - 1)) * (END - START);
          const p1 = polar(C, C, 46, deg);
          const p2 = polar(C, C, 43, deg);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--border-visible)"
              strokeWidth="1.5"
            />
          );
        })}
        {/* track */}
        <path
          d={arcPath(C, C, R, START, END)}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        {/* value arc */}
        {frac > 0.004 && (
          <path
            d={arcPath(C, C, R, START, valEnd)}
            fill="none"
            stroke={STATUS_HEX[status]}
            strokeWidth="3"
          />
        )}
      </svg>
      <div>
        <Label>{label}</Label>
        <div className="mt-1 flex items-baseline gap-1.5">
          <Value
            color={status === "neutral" ? "display" : status === "good" ? "success" : status === "moderate" ? "warning" : "accent"}
            className="text-[24px] leading-none"
          >
            {value}
          </Value>
          {unit ? <Label>{unit}</Label> : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sparkline: 1.5px line + dashed average ---------- */

export function Sparkline({
  label,
  values,
  unit,
  height = 40,
  status = "neutral",
}: {
  label: string;
  values: number[];
  unit?: string;
  height?: number;
  status?: keyof typeof STATUS_HEX;
}) {
  const W = 160;
  const H = height;
  if (values.length === 0) throw new Error(`Sparkline "${label}" got no data`);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 2) + 1;
    const y = H - 3 - ((v - min) / span) * (H - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = H - 3 - ((avg - min) / span) * (H - 6);
  const last = pts[pts.length - 1].split(",").map(Number);
  const current = values[values.length - 1];
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="flex items-baseline gap-1">
          <Value
            color={status === "neutral" ? "display" : status === "good" ? "success" : status === "moderate" ? "warning" : "accent"}
            className="text-[15px]"
          >
            {Number.isInteger(current) ? current : current.toFixed(2)}
          </Value>
          {unit ? <Label className="text-[10px]">{unit}</Label> : null}
        </span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <line
          x1="0"
          y1={avgY}
          x2={W}
          y2={avgY}
          stroke="var(--text-secondary)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={STATUS_HEX[status]}
          strokeWidth="1.5"
        />
        <circle cx={last[0]} cy={last[1]} r="2" fill={STATUS_HEX[status]} />
      </svg>
      <div className="mt-1 flex justify-between">
        <Label className="text-[9px]">{min.toFixed(1)}</Label>
        <Label className="text-[9px]">{max.toFixed(1)}</Label>
      </div>
    </div>
  );
}

/* ---------- Rings: concentric arcs for related percentages ---------- */

export function Rings({
  items,
  size = 132,
}: {
  items: { label: string; fraction: number; status?: keyof typeof STATUS_HEX }[];
  size?: number;
}) {
  const C = 66;
  const base = 50;
  const gap = 9;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 132 132" role="img">
        {items.map((it, i) => {
          const r = base - i * gap;
          const frac = Math.max(0, Math.min(1, it.fraction));
          const circ = 2 * Math.PI * r;
          return (
            <g key={it.label}>
              <circle
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <circle
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke={STATUS_HEX[it.status ?? "neutral"]}
                strokeWidth="3"
                strokeDasharray={`${(frac * circ).toFixed(1)} ${circ.toFixed(1)}`}
                transform={`rotate(-90 ${C} ${C})`}
              />
            </g>
          );
        })}
      </svg>
      <div className="space-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-3">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: STATUS_HEX[it.status ?? "neutral"] }}
            />
            <Label className="w-28">{it.label}</Label>
            <Value className="text-[13px]">{Math.round(it.fraction * 100)}%</Value>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ParamDotGrid: dot-matrix parameter board ---------- */

export function ParamDotGrid({
  cells,
}: {
  cells: {
    code: ParameterCode;
    label: string;
    status: "OK" | "WARN" | "FAIL" | "STALE" | "MISSING";
    valueText: string;
  }[];
}) {
  const hex = (s: string) =>
    s === "OK"
      ? "var(--success)"
      : s === "WARN" || s === "STALE"
        ? "var(--warning)"
        : "var(--accent)";
  const dim = (s: string) => (s === "OK" ? 6 : s === "WARN" || s === "STALE" ? 8 : 10);
  return (
    <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-6 md:grid-cols-11">
      {cells.map((c) => (
        <div key={c.code} className="flex flex-col items-start gap-1.5">
          <span
            className="rounded-none"
            style={{
              width: dim(c.status),
              height: dim(c.status),
              background: hex(c.status),
            }}
          />
          <Label className="text-[9px]">{c.label}</Label>
          <Value color="disabled" className="text-[10px]">
            {c.valueText}
          </Value>
        </div>
      ))}
    </div>
  );
}

/* ---------- TickTape: release-state history as segments ---------- */

export function TickTape({ tape }: { tape: ReleaseState[] }) {
  const hex = (s: ReleaseState) =>
    s === "SAFE"
      ? "var(--success)"
      : s === "CONDITIONAL"
        ? "var(--warning)"
        : s === "HOLD"
          ? "var(--accent)"
          : "var(--text-disabled)";
  return (
    <div className="flex h-2.5 w-full gap-[2px]">
      {tape.map((s, i) => (
        <div key={i} className="flex-1" style={{ background: hex(s) }} />
      ))}
    </div>
  );
}

/* ---------- ValveGlyph: the release valve as a physical control ---------- */

export function ValveGlyph({ state, size = 40 }: { state: ReleaseState; size?: number }) {
  const locked = state === "HOLD" || state === "MAINTENANCE";
  const stroke = locked ? "var(--accent)" : "var(--text-display)";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`valve ${locked ? "locked" : "open"}`}>
      <circle cx="20" cy="20" r="17" fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="var(--border-visible)" strokeWidth="1.5" />
      {/* handle: vertical = open flow, rotated 90° = locked */}
      <line
        x1="20"
        y1="3"
        x2="20"
        y2="37"
        stroke={stroke}
        strokeWidth="1.5"
        style={{
          transform: `rotate(${locked ? 90 : 0}deg)`,
          transformOrigin: "20px 20px",
          transition: "transform 250ms cubic-bezier(0.25,0.1,0.25,1)",
        }}
      />
      <circle cx="20" cy="20" r="2.5" fill={stroke} />
    </svg>
  );
}

/* ---------- MatrixLoader: 4×4 dot-matrix pulse (t-matrix) ---------- */

const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];

export function MatrixLoader({ variant = "scan", cycle = 1200 }: { variant?: "scan" | "twinkle" | "orbit" | "pulse"; cycle?: number }) {
  const RING = [1, 2, 7, 11, 14, 13, 8, 4];
  const INNER = [5, 6, 9, 10];
  return (
    <div className="t-matrix" data-variant={variant} role="status" aria-label="loading">
      {Array.from({ length: 16 }).map((_, idx) => {
        let d = 0;
        let steady = false;
        if (variant === "scan") d = Math.round((idx % 4) * (cycle / 10));
        else if (variant === "twinkle") d = Math.round(TWINKLE[idx] * (cycle / 16));
        else if (variant === "orbit") {
          const k = RING.indexOf(idx);
          if (k !== -1) d = Math.round(k * (cycle / 8));
          else steady = true;
        } else {
          d = Math.round((INNER.includes(idx) ? 0 : 1) * cycle * 0.16);
        }
        return (
          <i
            key={idx}
            style={steady ? { animation: "none" } : ({ "--d": `${d}ms` } as React.CSSProperties)}
          />
        );
      })}
    </div>
  );
}

/* ---------- Loading: dot-matrix + bracket text, no skeletons ---------- */

export function Loading({ text = "[LOADING…]" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-8">
      <MatrixLoader variant="scan" />
      <Label>{text}</Label>
    </div>
  );
}
