"use client";

// Process digital twin: the treatment train IS the primary layer.
// Stage blocks → monoline flow; faulted stage carries the one accent.

import { useState } from "react";
import { usePlant } from "@/data/PlantProvider";
import { STAGES } from "@/domain/plant";
import { Loading } from "@/ui/instruments";
import { Card, Label, PageHeader, Value } from "@/ui/primitives";

export default function TwinPage() {
  const { snapshot, t } = usePlant();
  const [selected, setSelected] = useState<string | null>(null);
  if (!snapshot) return <Loading text={t("common.loading")} />;

  const sel = selected
    ? snapshot.stages.find((s) => s.id === selected)!
    : snapshot.stages[snapshot.stages.length - 1];
  const selDef = STAGES.find((d) => d.id === sel.id);
  if (!selDef) throw new Error(`unknown stage: ${sel.id}`);

  return (
    <div>
      <PageHeader title={t("twin.title")} meta={t("twin.subtitle")} />

      {/* Train — vertical on mobile, horizontal wrap on desktop */}
      <section className="flex flex-col gap-0 md:flex-row md:flex-wrap md:items-stretch">
        {snapshot.stages.map((s, i) => (
          <div key={s.id} className="flex md:items-stretch">
            <button
              type="button"
              onClick={() => setSelected(s.id)}
              className={`flex-1 rounded-[4px] border p-4 text-left transition-colors duration-200 md:w-40 ${
                s.fault
                  ? "border-accent"
                  : sel.id === s.id
                    ? "border-display"
                    : "border-border-visible"
              } ${sel.id === s.id ? "bg-surface-raised" : "bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-[10px] tracking-[0.08em] uppercase ${
                    s.fault ? "text-accent" : "text-secondary"
                  }`}
                >
                  {t(s.name)}
                </span>
                {s.fault ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                ) : (
                  <span className="nd-blink h-1.5 w-1.5 rounded-full bg-success" />
                )}
              </div>
              <div className="mt-3 space-y-1">
                {s.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[9px] tracking-[0.06em] text-disabled">
                      {m.label}
                    </span>
                    <Value
                      className="text-[12px]"
                      color={s.fault ? "accent" : "primary"}
                    >
                      {m.value}
                    </Value>
                  </div>
                ))}
              </div>
            </button>
            {i < snapshot.stages.length - 1 && (
              <span className="mx-1 hidden self-center font-mono text-[14px] text-disabled md:inline">
                →
              </span>
            )}
            {i < snapshot.stages.length - 1 && (
              <span className="my-1 ml-6 h-4 w-px bg-border md:hidden" />
            )}
          </div>
        ))}
      </section>

      {/* Reject path — pattern before color (dotted) */}
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-block h-px w-16 border-t border-dashed border-border-visible" />
        <Label>{t("twin.reject")}</Label>
      </div>

      {/* Stage detail — secondary layer */}
      <section className="mt-12 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label>{t(sel.name)}</Label>
          <h2 className="mt-2 font-sans text-[24px] leading-[1.2] text-display">{selDef?.summary}</h2>
        </div>
        <div className="md:col-span-8">
          <Card>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
              {sel.metrics.map((m) => (
                <div key={m.label}>
                  <Label>{m.label}</Label>
                  <div className="mt-1">
                    <Value color={sel.fault ? "accent" : "display"} className="text-[20px]">
                      {m.value}
                    </Value>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
