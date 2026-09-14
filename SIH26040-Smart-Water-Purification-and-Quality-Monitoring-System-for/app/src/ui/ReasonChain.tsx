"use client";

// Full explainable reason chain — every fired rule with parameter, observed
// value, threshold and evidence age. The product's core differentiator.

import { Reason } from "@/domain/types";
import { usePlant } from "@/data/PlantProvider";
import { Label } from "./primitives";

export function ReasonChain({ reasons, className = "" }: { reasons: Reason[]; className?: string }) {
  const { t } = usePlant();
  if (reasons.length === 0) {
    return <Label className={className}>— {t("common.none")} —</Label>;
  }
  return (
    <ul className={`divide-y divide-border ${className}`}>
      {reasons.map((r) => (
        <li key={r.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
          <span
            className={`w-14 shrink-0 rounded-[4px] border px-1.5 py-0.5 text-center font-mono text-[10px] tracking-[0.06em] uppercase ${
              r.severity === "BLOCK"
                ? "border-accent text-accent"
                : r.severity === "WARN"
                  ? "border-border-visible text-warning"
                  : "border-border-visible text-secondary"
            }`}
          >
            {r.severity}
          </span>
          <span className="font-mono text-[12px] text-secondary">{r.code}</span>
          <span className="min-w-0 flex-1 font-sans text-[14px] text-primary">
            {r.parameter ? `${r.parameter} — ` : ""}
            {t(r.i18nKey)}
          </span>
          <span className="font-mono text-[12px] text-secondary">
            {r.observed ?? ""}
            {r.threshold ? ` · ${r.threshold}` : ""}
            {r.evidenceAgeDays !== undefined
              ? ` · ${r.evidenceAgeDays}${t("common.daysShort")} ${t("common.ago")}`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
