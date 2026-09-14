"use client";

// Nothing-system primitives. Every component applies the reference spec:
// labels = Space Mono ALL CAPS secondary; values = Space Mono; status color
// on the value only; pill buttons; segmented progress = discrete blocks.

import { ReactNode } from "react";

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-[11px] leading-[1.2] tracking-[0.08em] uppercase text-secondary ${className}`}
    >
      {children}
    </span>
  );
}

export function Value({
  children,
  className = "",
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: "primary" | "display" | "success" | "warning" | "accent" | "secondary" | "disabled";
}) {
  const c =
    color === "success"
      ? "text-success"
      : color === "warning"
        ? "text-warning"
        : color === "accent"
          ? "text-accent"
          : color === "display"
            ? "text-display"
            : color === "disabled"
              ? "text-disabled"
              : color === "secondary"
                ? "text-secondary"
                : "text-primary";
  return <span className={`font-mono transition-colors duration-200 ease-out ${c} ${className}`}>{children}</span>;
}

export function statusColor(status: "OK" | "WARN" | "FAIL" | "STALE" | "MISSING" | string) {
  return status === "OK"
    ? ("success" as const)
    : status === "WARN" || status === "STALE"
      ? ("warning" as const)
      : status === "FAIL" || status === "MISSING"
        ? ("accent" as const)
        : ("primary" as const);
}

export function Chip({
  children,
  active = false,
  technical = false,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  technical?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border border-border-visible px-3 py-1 font-mono text-[12px] tracking-[0.04em] uppercase transition-colors duration-200 ease-out ${
        technical ? "rounded-[4px]" : "rounded-full"
      } ${active ? "border-display text-display" : "text-secondary"} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  raised = false,
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border p-4 transition-colors duration-200 ease-out hover:border-border-visible md:p-6 ${
        raised ? "bg-surface-raised" : "bg-surface"
      } ${className}`}
    >
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "destructive";

export function Button({
  children,
  variant = "secondary",
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "min-h-11 rounded-full px-6 py-3 font-mono text-[13px] tracking-[0.06em] uppercase transition-colors duration-200 ease-out disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-display text-canvas"
      : variant === "destructive"
        ? "border border-accent text-accent"
        : variant === "ghost"
          ? "text-secondary hover:text-primary"
          : "border border-border-visible text-primary hover:border-display";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

/** The signature data viz: discrete square segments, 2px gaps. */
export function SegmentedProgress({
  label,
  valueText,
  fraction,
  segments = 20,
  status = "neutral",
  size = "standard",
}: {
  label?: string;
  valueText?: string;
  fraction: number; // 0..1
  segments?: number;
  status?: "neutral" | "good" | "moderate" | "over";
  size?: "hero" | "standard" | "compact";
}) {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * segments);
  const fill =
    status === "over"
      ? "bg-accent"
      : status === "moderate"
        ? "bg-warning"
        : status === "good"
          ? "bg-success"
          : "bg-display";
  const h = size === "hero" ? "h-5" : size === "compact" ? "h-1.5" : "h-2.5";
  return (
    <div>
      {(label || valueText) && (
        <div className="mb-2 flex items-baseline justify-between">
          {label ? <Label>{label}</Label> : <span />}
          {valueText ? <Value className="text-[13px]">{valueText}</Value> : null}
        </div>
      )}
      <div className={`flex w-full gap-[2px] ${h}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-colors duration-200 ease-out ${i < filled ? fill : "bg-border"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function StatRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: "primary" | "display" | "success" | "warning" | "accent" | "secondary" | "disabled";
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border py-3 last:border-b-0">
      <Label>{label}</Label>
      <span className="flex items-baseline gap-1">
        <Value color={color} className="text-[15px]">
          {value}
        </Value>
        {unit ? <Label className="text-[10px]">{unit}</Label> : null}
      </span>
    </div>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-sans text-[24px] leading-[1.2] tracking-[-0.01em] text-display ${className}`}>
      {children}
    </h2>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="dot-grid-subtle flex flex-col items-center justify-center gap-2 py-24">
      <p className="font-sans text-[18px] text-secondary">{title}</p>
      {hint ? <p className="font-mono text-[12px] text-disabled">{hint}</p> : null}
    </div>
  );
}

export function InlineStatus({
  kind,
  children,
}: {
  kind: "saved" | "error" | "info";
  children: ReactNode;
}) {
  const c = kind === "error" ? "text-accent" : kind === "saved" ? "text-success" : "text-secondary";
  return <span className={`nd-in font-mono text-[12px] tracking-[0.04em] ${c}`}>{children}</span>;
}

export function PageHeader({
  title,
  meta,
}: {
  title: string;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-8 md:mb-12">
      <Label>{meta}</Label>
      <h1 className="mt-2 font-sans text-[36px] leading-[1.1] tracking-[-0.02em] text-display">
        {title}
      </h1>
    </header>
  );
}
