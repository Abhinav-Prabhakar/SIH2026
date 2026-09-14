"use client";

// Scenario control: deterministic replay for judges. Selector (primary),
// event timeline (secondary), seed/tick metadata (tertiary).

import { usePlant } from "@/data/PlantProvider";
import { ReleaseState, SCENARIO_IDS } from "@/domain/types";
import { SCENARIOS } from "@/sim/scenarios";
import { Loading, TickTape } from "@/ui/instruments";
import { SlidingTabs } from "@/ui/SlidingTabs";
import {
  Button,
  Card,
  Chip,
  Label,
  PageHeader,
  Value,
} from "@/ui/primitives";

const STATE_COLOR: Record<string, string> = {
  SAFE: "text-success",
  CONDITIONAL: "text-warning",
  HOLD: "text-accent",
  MAINTENANCE: "text-secondary",
};

const TAPE_LABEL: Record<ReleaseState, string> = {
  SAFE: "SAFE",
  CONDITIONAL: "COND",
  HOLD: "HOLD",
  MAINTENANCE: "MAINT",
};

export default function DemoPage() {
  const { snapshot, scenario, eventLog, tick, t, selectScenario, resetDemo } = usePlant();
  if (!snapshot) return <Loading text={t("common.loading")} />;

  const def = SCENARIOS[scenario];

  return (
    <div>
      <PageHeader title={t("demo.title")} meta={t("demo.hint")} />

      {/* Scenario selector — sliding pill segmented control */}
      <section>
        <Label>{t("demo.select")}</Label>
        <div className="mt-3 max-w-full overflow-x-auto pb-1">
          <SlidingTabs
            ariaLabel={t("demo.select")}
            options={SCENARIO_IDS.map((id) => ({ id, label: t(SCENARIOS[id].i18nKey) }))}
            value={scenario}
            onChange={(id) => selectScenario(id as typeof scenario)}
          />
        </div>
        <p className="mt-4 max-w-xl font-sans text-[15px] text-primary">{t(def.blurbI18nKey)}</p>
      </section>

      {/* Current state + release tape */}
      <section className="mt-10 flex flex-wrap items-center gap-6">
        <div>
          <Label>{t("demo.currentState")}</Label>
          <div className={`mt-1 font-display text-[36px] leading-none ${STATE_COLOR[snapshot.release.state]}`}>
            {t(`release.${snapshot.release.state}`)}
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <Label>{t("demo.tick")}</Label>
            <div className="mt-1 font-mono text-[20px] text-display">{tick}</div>
          </div>
          <div>
            <Label>{t("demo.seed")}</Label>
            <div className="mt-1 font-mono text-[20px] text-display">
              0x{def.seed.toString(16).toUpperCase()}
            </div>
          </div>
        </div>
        <Button variant="destructive" onClick={resetDemo}>
          {t("common.reset")}
        </Button>
      </section>

      {/* Release tape — last 48 ticks as a segmented strip */}
      <section className="mt-10">
        <div className="mb-2 flex items-baseline justify-between">
          <Label>RELEASE TAPE · LAST {snapshot.releaseTape.length} TICKS</Label>
          <div className="flex gap-4">
            {(["SAFE", "CONDITIONAL", "HOLD", "MAINTENANCE"] as const).map((s) => (
              <span key={s} className={`font-mono text-[9px] tracking-[0.06em] ${STATE_COLOR[s]}`}>
                {TAPE_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
        <TickTape tape={snapshot.releaseTape} />
      </section>

      {/* Event log */}
      <section className="mt-12">
        <Label>{t("demo.eventLog")}</Label>
        {eventLog.length === 0 ? (
          <p className="mt-4 font-mono text-[12px] text-disabled">— {t("common.none")} —</p>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y divide-border">
              {[...eventLog].reverse().map((e, i) => (
                <li key={`${e.tick}-${i}`} className="flex items-baseline gap-4 py-2.5">
                  <Value color="disabled" className="w-16 shrink-0 text-[11px]">
                    T+{e.tick}
                  </Value>
                  <span className="font-sans text-[14px] text-primary">{t(e.i18nKey)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Scenario map — what each proves */}
      <section className="mt-12">
        <Label>{t("demo.select")}</Label>
        <ul className="mt-4 divide-y divide-border">
          {SCENARIO_IDS.map((id) => (
            <li key={id} className="flex items-baseline gap-4 py-3">
              <Chip technical active={id === scenario} className="w-44 justify-center">
                {t(SCENARIOS[id].i18nKey)}
              </Chip>
              <span className="font-sans text-[14px] text-secondary">
                {t(SCENARIOS[id].blurbI18nKey)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
