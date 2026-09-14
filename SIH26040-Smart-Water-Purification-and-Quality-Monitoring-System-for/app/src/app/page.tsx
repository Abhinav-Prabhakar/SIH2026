"use client";

// Judge-facing pitch: asymmetric, top-heavy. The product IS the demo —
// the live release banner below the hero is wired to the active scenario.

import Link from "next/link";
import { usePlant } from "@/data/PlantProvider";
import { BIS_IS_10500, evaluateEvidence } from "@/domain/standards";
import { SOURCE_PROFILES } from "@/domain/plant";
import { Loading, Rings, Sparkline } from "@/ui/instruments";
import { ReleaseBanner } from "@/ui/ReleaseBanner";
import { Button, Card, Chip, Label, SectionTitle, SegmentedProgress, Value } from "@/ui/primitives";

const DIFF_KEYS = [
  "pitch.diff.1",
  "pitch.diff.2",
  "pitch.diff.3",
  "pitch.diff.4",
  "pitch.diff.5",
  "pitch.diff.6",
];

export default function PitchPage() {
  const { t, snapshot } = usePlant();

  return (
    <div>
      {/* Hero — the ONE break: Doto headline + thesis */}
      <section className="dot-grid-subtle -mx-4 px-4 pb-16 pt-10 md:-mx-6 md:px-6 md:pb-24 md:pt-16">
        <div className="nd-in"><Label>SIH26040 · GOVT OF JHARKHAND · CLEAN & GREEN TECH</Label></div>
        <h1 className="nd-in nd-in-1 mt-6 font-display text-[56px] leading-[0.95] tracking-[-0.03em] text-display md:text-[96px]">
          NEER//OS
        </h1>
        <p className="nd-in nd-in-2 mt-6 max-w-2xl font-sans text-[18px] leading-[1.5] text-primary md:text-[24px]">
          {t("pitch.headline")}
        </p>
        <p className="nd-in nd-in-3 mt-4 max-w-xl font-sans text-[14px] leading-[1.5] text-secondary">
          {t("pitch.thesis")}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/demo">
            <Button variant="primary">{t("pitch.cta.demo")}</Button>
          </Link>
          <Link href="/plant">
            <Button variant="secondary">{t("pitch.cta.plant")}</Button>
          </Link>
        </div>
      </section>

      {/* Live release banner — product is the demo */}
      <ReleaseBanner />

      {/* Live instrument cluster — rings + a real series */}
      {snapshot ? (
        <section className="grid gap-10 md:grid-cols-2">
          <Rings
            items={(() => {
              const src = SOURCE_PROFILES[snapshot.sourceProfile];
              const freshness = Math.min(
                ...src.requiredEvidence.map((c) => {
                  const spec = BIS_IS_10500[c];
                  const ev = evaluateEvidence(c, snapshot.labEvidence, snapshot.at);
                  if (!ev.report) return 0;
                  const horizon = spec.freshnessHorizonDays ?? 30;
                  return Math.max(0, 1 - ev.ageDays! / horizon);
                })
              );
              return [
                { label: "EVIDENCE", fraction: freshness, status: freshness < 0.2 ? "over" as const : freshness < 0.4 ? "moderate" as const : "good" as const },
                { label: "SENSOR TRUST", fraction: Math.min(...snapshot.trust.map((x) => x.score)) },
                { label: "MEDIA RUL", fraction: snapshot.assets.find((a) => a.assetId === "MEDIA_FE_MN")!.remainingFraction },
              ];
            })()}
          />
          <Card>
            <Sparkline
              label={t("plant.w.turbOut")}
              values={snapshot.series.find((s) => s.code === "TURBIDITY")!.values}
              unit="NTU"
            />
          </Card>
        </section>
      ) : (
        <Loading text={t("common.loading")} />
      )}

      {/* Problem */}
      <section className="mt-16 grid gap-8 md:mt-24 md:grid-cols-12">
        <div className="md:col-span-4">
          <SectionTitle>{t("pitch.problem.title")}</SectionTitle>
        </div>
        <p className="max-w-xl font-sans text-[16px] leading-[1.6] text-primary md:col-span-8">
          {t("pitch.problem.body")}
        </p>
      </section>

      {/* Plant model — the train as data */}
      <section className="mt-16 md:mt-24">
        <SectionTitle>{t("pitch.model.title")}</SectionTitle>
        <p className="mt-4 max-w-xl font-sans text-[16px] leading-[1.6] text-primary">
          {t("pitch.model.body")}
        </p>
        {snapshot && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {snapshot.stages.map((s, i) => (
              <span key={s.id} className="flex items-center gap-2">
                <Chip technical active={!s.fault} className={s.fault ? "border-accent text-accent" : ""}>
                  {t(s.name)}
                </Chip>
                {i < snapshot.stages.length - 1 && (
                  <span className="font-mono text-[12px] text-disabled">→</span>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Evidence model */}
      <section className="mt-16 grid gap-8 md:mt-24 md:grid-cols-12">
        <div className="md:col-span-4">
          <SectionTitle>{t("pitch.evidence.title")}</SectionTitle>
        </div>
        <div className="md:col-span-8">
          <p className="max-w-xl font-sans text-[16px] leading-[1.6] text-primary">
            {t("pitch.evidence.body")}
          </p>
          {snapshot && (
            <div className="mt-8 max-w-md">
              <SegmentedProgress
                label={t("quality.freshness")}
                valueText={`${snapshot.labEvidence.length} ${t("common.events")}`}
                fraction={0.8}
                status="good"
              />
            </div>
          )}
        </div>
      </section>

      {/* Differentiation */}
      <section className="mt-16 md:mt-24">
        <SectionTitle>{t("pitch.diff.title")}</SectionTitle>
        <ul className="mt-8 grid max-w-3xl gap-x-10 gap-y-0 md:grid-cols-2">
          {DIFF_KEYS.map((k, i) => (
            <li key={k} className="flex items-baseline gap-4 border-b border-border py-4">
              <Value color="disabled" className="text-[12px]">
                {String(i + 1).padStart(2, "0")}
              </Value>
              <span className="font-sans text-[15px] text-primary">{t(k)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Honest scope footer */}
      <section className="mt-24 border-t border-border pb-8 pt-8">
        <Label>{t("pitch.scopeNote")}</Label>
      </section>
    </div>
  );
}
