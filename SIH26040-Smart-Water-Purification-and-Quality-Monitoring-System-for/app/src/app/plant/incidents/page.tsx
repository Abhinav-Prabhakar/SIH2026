"use client";

// Incidents & response: active interlock reason chain (primary),
// ordered response checklist (secondary), resolved ledger (tertiary).

import { usePlant } from "@/data/PlantProvider";
import { ReasonChain } from "@/ui/ReasonChain";
import { Button, Chip, EmptyState, Label, PageHeader, Value } from "@/ui/primitives";

const STEPS = [
  "incident.step.ack",
  "incident.step.verify",
  "incident.step.remediate",
  "incident.step.retest",
];

export default function IncidentsPage() {
  const { snapshot, t, acknowledgeIncident } = usePlant();
  if (!snapshot) return <Label>{t("common.loading")}</Label>;

  const active = snapshot.incidents.filter((i) => !i.closedAt);
  const resolved = snapshot.incidents.filter((i) => i.closedAt);
  const liveHold = snapshot.release.state === "HOLD" || snapshot.release.state === "MAINTENANCE";

  return (
    <div>
      <PageHeader title={t("nav.incidents")} meta={t("incident.checklist")} />

      {active.length === 0 && !liveHold ? (
        <EmptyState title={t("incident.none")} hint={t("common.seededDemo")} />
      ) : (
        <div className="space-y-10">
          {(active.length > 0 ? active : snapshot.incidents.slice(0, 1)).map((inc) => (
            <section key={inc.id}>
              <div className="flex flex-wrap items-center gap-3">
                <Chip technical className={inc.closedAt ? "" : "border-accent text-accent"}>
                  {inc.closedAt ? t("incident.resolved") : t("incident.active")}
                </Chip>
                <h2 className="font-sans text-[24px] text-display">{t(inc.titleI18nKey)}</h2>
                <Value color="disabled" className="text-[12px]">
                  {inc.id}
                </Value>
              </div>

              <ReasonChain reasons={inc.reasons} className="mt-6" />

              {/* Response checklist */}
              <ol className="mt-8 space-y-0">
                {STEPS.map((k, i) => {
                  const done = i === 0 ? inc.acknowledged : false;
                  return (
                    <li key={k} className="flex items-center gap-4 border-b border-border py-4">
                      <Value color={done ? "success" : "disabled"} className="w-8 text-[12px]">
                        {done ? "[✓]" : `[${i + 1}]`}
                      </Value>
                      <span
                        className={`flex-1 font-sans text-[15px] ${
                          done ? "text-secondary line-through" : "text-primary"
                        }`}
                      >
                        {t(k)}
                      </span>
                      {i === 0 && !inc.acknowledged && !inc.closedAt && (
                        <Button variant="secondary" onClick={() => acknowledgeIncident(inc.id)} className="!min-h-9 !px-4 !py-1.5">
                          {t("common.acknowledge")}
                        </Button>
                      )}
                      {i === 0 && inc.acknowledged && (
                        <Value color="success" className="text-[11px]">
                          {t("common.acknowledged")}
                        </Value>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="mt-16">
          <Label>{t("incident.resolved")}</Label>
          <ul className="mt-4 divide-y divide-border">
            {resolved.map((inc) => (
              <li key={inc.id} className="flex items-baseline justify-between py-3">
                <span className="font-mono text-[12px] text-secondary">{inc.id}</span>
                <span className="font-sans text-[14px] text-secondary">{t(inc.titleI18nKey)}</span>
                <Value color="success" className="text-[11px]">
                  {t("incident.resolved")}
                </Value>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
