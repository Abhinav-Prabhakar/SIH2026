"use client";

// The hero component: release state as primary layer, first reasons as
// secondary, standards/evidence metadata as tertiary. Never boxed.

import { useState } from "react";
import { usePlant } from "@/data/PlantProvider";
import { ValveGlyph } from "./instruments";
import { Button, Label } from "./primitives";
import { ReasonChain } from "./ReasonChain";

const STATE_COLOR: Record<string, string> = {
  SAFE: "text-success",
  CONDITIONAL: "text-warning",
  HOLD: "text-accent",
  MAINTENANCE: "text-secondary",
};

export function ReleaseBanner({ compact = false }: { compact?: boolean }) {
  const { snapshot, t } = usePlant();
  const [showWhy, setShowWhy] = useState(false);
  if (!snapshot) return null;

  const { state, reasons } = snapshot.release;
  const color = STATE_COLOR[state];
  const topReasons = reasons.slice(0, compact ? 1 : 2);

  return (
    <section className={compact ? "py-6" : "py-10 md:py-16"}>
      <Label>RELEASE GATE · BIS IS 10500</Label>
      <div className="mt-3 flex items-center gap-4 md:gap-6">
        <ValveGlyph state={state} size={compact ? 44 : 64} />
        <h2
          className={`font-display leading-none tracking-[-0.02em] transition-colors duration-300 ease-out ${color} ${
            compact ? "text-[36px] md:text-[48px]" : "text-[48px] md:text-[72px]"
          }`}
        >
          {t(`release.${state}`)}
        </h2>
      </div>
      <p className="mt-4 max-w-xl font-sans text-[16px] leading-[1.5] text-primary">
        {t(`release.${state}.desc`)}
      </p>

      {topReasons.length > 0 && (
        <ul className="mt-6 space-y-2">
          {topReasons.map((r) => (
            <li key={r.code} className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded-[4px] border border-border-visible px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] uppercase ${
                  r.severity === "BLOCK" ? "text-accent" : "text-warning"
                }`}
              >
                {r.code}
              </span>
              <span className="font-sans text-[14px] text-primary">
                {r.parameter ? `${r.parameter} — ` : ""}
                {t(r.i18nKey)}
              </span>
              {r.observed ? (
                <span className="font-mono text-[12px] text-secondary">{r.observed}</span>
              ) : null}
              {r.threshold ? (
                <span className="font-mono text-[12px] text-disabled">({r.threshold})</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {reasons.length > 2 && (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setShowWhy(!showWhy)} className="!px-0">
            {t("common.why")} {showWhy ? "▴" : "▾"} · {reasons.length} {t("common.events")}
          </Button>
          <div className="nd-acc" data-open={showWhy}>
            <div className="nd-acc-inner">
              <ReasonChain reasons={reasons} className="mt-2" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1">
        <Label>BIS IS 10500:2012</Label>
        <Label>{t("common.seededDemo")}</Label>
      </div>
    </section>
  );
}
