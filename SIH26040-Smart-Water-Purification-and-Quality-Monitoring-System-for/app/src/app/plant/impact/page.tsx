"use client";

// Impact: hero certified-safe litres, three axes with different viz forms.
// All estimates labelled EST. — honesty is a feature.

import { usePlant } from "@/data/PlantProvider";
import { impactMetrics } from "@/domain/impact";
import { Label, PageHeader, SegmentedProgress, StatRow, Value } from "@/ui/primitives";

export default function ImpactPage() {
  const { snapshot, t } = usePlant();
  if (!snapshot) return <Label>{t("common.loading")}</Label>;

  const m = impactMetrics(snapshot.counters);
  const get = (id: string) => m.find((x) => x.id === id)!;
  const safeL = get("safe_litres");

  return (
    <div>
      <PageHeader title={t("impact.title")} meta={t("impact.note")} />

      {/* Primary: hero number */}
      <section>
        <Label>{t(safeL.i18nKey)}</Label>
        <div className="mt-2 font-display text-[56px] leading-none text-display md:text-[72px]">
          {safeL.value.toLocaleString("en-IN")}
          <span className="ml-3 font-mono text-[14px] tracking-[0.08em] text-secondary">
            {safeL.unit}
          </span>
        </div>
      </section>

      {/* Three axes, three forms */}
      <section className="mt-16 grid gap-10 md:grid-cols-3">
        <div>
          <Label>{t("impact.axis.health")}</Label>
          <div className="mt-4">
            <StatRow
              label={t(get("person_days").i18nKey)}
              value={get("person_days").value.toLocaleString("en-IN")}
              unit={get("person_days").estimate ? t("common.est") : undefined}
            />
            <StatRow
              label={t(get("exposure_prevented").i18nKey)}
              value={get("exposure_prevented").value.toLocaleString("en-IN")}
              unit="L"
            />
            <StatRow
              label={t("incident.holdOpened")}
              value={`${snapshot.counters.holdEvents}`}
            />
          </div>
        </div>

        <div>
          <Label>{t("impact.axis.economic")}</Label>
          <div className="mt-4">
            <Value color="display" className="text-[28px]">
              ₹{get("cost_delta").value.toLocaleString("en-IN")}
            </Value>
            <span className="ml-2 font-mono text-[10px] tracking-[0.06em] text-disabled">
              {t("common.est")}
            </span>
            <p className="mt-1 font-mono text-[11px] text-secondary">
              {t(get("cost_delta").i18nKey)}
            </p>
          </div>
          <div className="mt-6">
            <SegmentedProgress
              label={t(get("energy_per_litre").i18nKey)}
              valueText={`${get("energy_per_litre").value.toFixed(2)} ${get("energy_per_litre").unit}`}
              fraction={Math.min(1, get("energy_per_litre").value / 2)}
              status="neutral"
              size="compact"
            />
          </div>
        </div>

        <div>
          <Label>{t("impact.axis.environmental")}</Label>
          <div className="mt-4">
            <StatRow
              label={t(get("contaminant_mass").i18nKey)}
              value={get("contaminant_mass").value.toLocaleString("en-IN")}
              unit={`G ${t("common.est")}`}
            />
            <StatRow
              label={t("twin.reject")}
              value={snapshot.counters.rejectLitres.toLocaleString("en-IN")}
              unit="L"
            />
            <StatRow
              label={t("plant.w.flow")}
              value={`${Math.round(snapshot.counters.litresTreated).toLocaleString("en-IN")}`}
              unit="L"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
