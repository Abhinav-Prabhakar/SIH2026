"use client";

// Maintenance: worst-off asset health (primary), work orders (secondary),
// calibration table (tertiary). Transparent scoring — inputs shown.

import { usePlant } from "@/data/PlantProvider";
import { CALIBRATION_INTERVAL_DAYS } from "@/domain/trust";
import { Loading } from "@/ui/instruments";
import { DAY_MS } from "@/domain/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  PageHeader,
  SegmentedProgress,
  Value,
} from "@/ui/primitives";

export default function MaintenancePage() {
  const { snapshot, t, setWorkOrderStatus } = usePlant();
  if (!snapshot) return <Loading text={t("common.loading")} />;

  const worst = [...snapshot.assets].sort((a, b) => a.remainingFraction - b.remainingFraction)[0];
  const worstPct = Math.round(worst.remainingFraction * 100);

  return (
    <div>
      <PageHeader title={t("maint.title")} meta={t("maint.workOrders")} />

      {/* Primary: worst asset */}
      <section className="max-w-2xl">
        <Label>{worst.name} · {t("maint.rul")}</Label>
        <div className="mt-2 flex items-baseline gap-3">
          <span
            className={`font-display text-[56px] leading-none md:text-[72px] ${
              worstPct < 15 ? "text-accent" : worstPct < 35 ? "text-warning" : "text-display"
            }`}
          >
            {worstPct}%
          </span>
        </div>
        <div className="mt-4">
          <SegmentedProgress
            fraction={worst.remainingFraction}
            status={worstPct < 15 ? "over" : worstPct < 35 ? "moderate" : "good"}
            size="hero"
          />
        </div>
        <div className="mt-3 space-y-1">
          {worst.basis.map((b) => (
            <p key={b} className="font-mono text-[11px] tracking-[0.04em] text-disabled">
              {b}
            </p>
          ))}
        </div>
      </section>

      {/* All assets */}
      <section className="mt-12 grid gap-4 md:grid-cols-2">
        {snapshot.assets.map((a) => {
          const pct = Math.round(a.remainingFraction * 100);
          return (
            <Card key={a.assetId}>
              <SegmentedProgress
                label={a.name}
                valueText={`${pct}%`}
                fraction={a.remainingFraction}
                status={pct < 15 ? "over" : pct < 35 ? "moderate" : "good"}
                size="compact"
              />
              <div className="mt-3 space-y-0.5">
                {a.basis.map((b) => (
                  <p key={b} className="font-mono text-[10px] tracking-[0.04em] text-disabled">
                    {b}
                  </p>
                ))}
              </div>
            </Card>
          );
        })}
      </section>

      {/* Work orders */}
      <section className="mt-12">
        <Label>{t("maint.workOrders")}</Label>
        {snapshot.workOrders.length === 0 ? (
          <EmptyState title={t("maint.none")} />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {snapshot.workOrders.map((wo) => (
              <li key={wo.id} className="flex flex-wrap items-center gap-3 py-4">
                <span className="font-mono text-[12px] text-disabled">{wo.id}</span>
                <span className="min-w-0 flex-1 font-sans text-[15px] text-primary">
                  {t(wo.titleI18nKey)}
                  <span className="ml-3 font-mono text-[11px] text-secondary">{wo.reason}</span>
                </span>
                <Chip
                  technical
                  active={wo.status === "DONE"}
                  className={wo.status === "DONE" ? "border-success text-success" : wo.status === "IN_PROGRESS" ? "text-warning" : ""}
                >
                  {t(`wo.status.${wo.status}`)}
                </Chip>
                {wo.status === "OPEN" && (
                  <Button
                    variant="ghost"
                    className="!min-h-9 !px-3 !py-1"
                    onClick={() => setWorkOrderStatus(wo.id, "IN_PROGRESS")}
                  >
                    {t("maint.markProgress")}
                  </Button>
                )}
                {wo.status !== "DONE" && (
                  <Button
                    variant="secondary"
                    className="!min-h-9 !px-4 !py-1"
                    onClick={() => setWorkOrderStatus(wo.id, "DONE")}
                  >
                    {t("maint.markDone")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Calibration */}
      <section className="mt-12">
        <Label>{t("maint.calibration")}</Label>
        <ul className="mt-4 max-w-xl divide-y divide-border">
          {snapshot.trust.map((s) => {
            const days = Math.floor((snapshot.at - s.lastCalibratedAt) / DAY_MS);
            const overdue = s.flags.includes("CAL_OVERDUE");
            return (
              <li key={s.sensorId} className="flex items-baseline justify-between py-3">
                <span className="font-mono text-[12px] text-secondary">
                  {s.sensorId} · {s.parameter}
                </span>
                <span className="font-mono text-[12px] text-secondary">
                  {t("maint.lastCal")} {days}D · {t("maint.trustScore")}{" "}
                  <Value color={s.score < 0.4 ? "accent" : s.score < 0.7 ? "warning" : "primary"}>
                    {Math.round(s.score * 100)}%
                  </Value>
                  {s.flags.length > 0 && (
                    <span className="ml-2 text-warning">{s.flags.join("+")}</span>
                  )}
                </span>
                <Value color={overdue ? "accent" : "disabled"} className="text-[11px]">
                  {overdue ? `+${days - CALIBRATION_INTERVAL_DAYS}D` : `${CALIBRATION_INTERVAL_DAYS - days}D`}
                </Value>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
