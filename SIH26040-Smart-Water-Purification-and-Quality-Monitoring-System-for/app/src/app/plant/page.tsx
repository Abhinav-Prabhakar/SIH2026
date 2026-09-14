"use client";

// Shift overview: release banner (primary), next action (secondary),
// instrument widgets — each a different viz form per the variety rule.

import { usePlant } from "@/data/PlantProvider";
import { evaluateValue, BIS_IS_10500 } from "@/domain/standards";
import { PlantSnapshot } from "@/domain/types";
import { Gauge, Loading, Sparkline } from "@/ui/instruments";
import { ReleaseBanner } from "@/ui/ReleaseBanner";
import {
  Card,
  Chip,
  Label,
  PageHeader,
  SegmentedProgress,
  StatRow,
  Value,
} from "@/ui/primitives";

function live(snapshot: PlantSnapshot, code: string): number {
  const r = snapshot.live.find((r) => r.code === code);
  if (!r) throw new Error(`missing live reading: ${code}`);
  return r.value;
}

function series(snapshot: PlantSnapshot, code: string): number[] {
  const s = snapshot.series.find((s) => s.code === code);
  if (!s) throw new Error(`missing series: ${code}`);
  return s.values;
}

export default function PlantPage() {
  const { snapshot, t, setMaintenanceHold } = usePlant();
  if (!snapshot) return <Loading text={t("common.loading")} />;

  const state = snapshot.release.state;
  const actionKey =
    state === "SAFE"
      ? "plant.action.safe"
      : state === "CONDITIONAL"
        ? "plant.action.conditional"
        : state === "HOLD"
          ? "plant.action.hold"
          : "plant.action.maintenance";

  const cl2 = live(snapshot, "CHLORINE");
  const cl2Status = evaluateValue(BIS_IS_10500.CHLORINE, cl2);
  const turb = live(snapshot, "TURBIDITY");
  const turbStatus = evaluateValue(BIS_IS_10500.TURBIDITY, turb);
  const media = snapshot.assets.find((a) => a.assetId === "MEDIA_FE_MN");
  if (!media) throw new Error("missing asset MEDIA_FE_MN");
  const minTrust = Math.min(...snapshot.trust.map((x) => x.score));
  const turbIn = snapshot.stages[0].metrics.find((m) => m.label === "TURB IN");
  if (!turbIn) throw new Error("missing intake turbidity metric");

  const seg = (s: "OK" | "WARN" | "FAIL") =>
    s === "OK" ? ("good" as const) : s === "WARN" ? ("moderate" as const) : ("over" as const);

  return (
    <div>
      <PageHeader
        title={t("plant.title")}
        meta={
          <>
            {t("plant.sourceProfile")} · {t(`source.${snapshot.sourceProfile === "MINE_AFFECTED" ? "mineAffected" : "borewellFe"}`)}
          </>
        }
      />

      <ReleaseBanner compact />

      {/* Next action — secondary layer */}
      <div className="mt-4 flex items-baseline gap-4">
        <Label>{t("plant.nextAction")}</Label>
        <p className="font-sans text-[15px] text-primary">{t(actionKey)}</p>
      </div>

      {/* Instrument widgets — each a different form */}
      <section className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <Label>{t("plant.w.flow")}</Label>
          <div className="mt-3 font-display text-[36px] leading-none text-display">
            {snapshot.flowLph}
            <span className="ml-2 font-mono text-[11px] tracking-[0.08em] text-secondary">LPH</span>
          </div>
        </Card>

        <Card>
          <Sparkline
            label={t("plant.w.turbOut")}
            values={series(snapshot, "TURBIDITY")}
            unit="NTU"
            status={seg(turbStatus)}
          />
          <div className="mt-3">
            <StatRow label={t("plant.w.turbIn")} value={turbIn.value} />
          </div>
        </Card>

        <Card>
          <Gauge
            label={t("plant.w.chlorine")}
            value={cl2.toFixed(2)}
            unit="MG/L"
            fraction={cl2 / 1.0}
            status={seg(cl2Status)}
          />
          <div className="mt-3">
            <Label>BAND 0.2–1.0 MG/L</Label>
          </div>
        </Card>

        <Card>
          <SegmentedProgress
            label={t("plant.w.filterRul")}
            valueText={`${Math.round(media.remainingFraction * 100)}%`}
            fraction={media.remainingFraction}
            status={
              media.remainingFraction < 0.15
                ? "over"
                : media.remainingFraction < 0.35
                  ? "moderate"
                  : "good"
            }
          />
          <div className="mt-3 space-y-0.5">
            {media.basis.map((b) => (
              <p key={b} className="font-mono text-[10px] tracking-[0.04em] text-disabled">
                {b}
              </p>
            ))}
          </div>
        </Card>

        <Card>
          <Label>{t("plant.w.trust")}</Label>
          <div className="mt-3">
            <Value
              color={minTrust < 0.4 ? "accent" : minTrust < 0.7 ? "warning" : "success"}
              className="text-[28px]"
            >
              {Math.round(minTrust * 100)}%
            </Value>
            <span className="ml-2 font-mono text-[11px] text-secondary">MIN</span>
          </div>
          <div className="mt-2 space-y-1">
            {snapshot.trust
              .filter((x) => x.flags.length > 0)
              .slice(0, 2)
              .map((x) => (
                <p key={x.sensorId} className="font-mono text-[10px] tracking-[0.04em] text-warning">
                  {x.sensorId} · {x.flags.join("+")}
                </p>
              ))}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <Label>{t("common.holdToggle")}</Label>
          <button
            type="button"
            onClick={() => setMaintenanceHold(state !== "MAINTENANCE")}
            aria-pressed={state === "MAINTENANCE"}
            className="mt-4 flex h-8 w-16 items-center rounded-full border border-border-visible p-1"
          >
            <span
              className={`h-6 w-6 rounded-full transition-all duration-200 ease-out ${
                state === "MAINTENANCE" ? "ml-7 bg-display" : "ml-0 bg-disabled"
              }`}
            />
          </button>
          <div className="mt-3">
            <Chip technical active={state === "MAINTENANCE"}>
              {state === "MAINTENANCE" ? "ENGAGED" : "RELEASED"}
            </Chip>
          </div>
        </Card>
      </section>
    </div>
  );
}
