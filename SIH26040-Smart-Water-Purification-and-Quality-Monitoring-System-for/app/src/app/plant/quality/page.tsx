"use client";

// Quality evidence ledger — what we know vs. when we knew it.
// Lab-only params show dated evidence, never synthetic "live" values.

import { useState } from "react";
import { usePlant } from "@/data/PlantProvider";
import {
  BIS_IS_10500,
  evaluateEvidence,
  evaluateLive,
  LAB_PARAMETERS,
  LIVE_PARAMETERS,
  thresholdText,
} from "@/domain/standards";
import { LabValue, ParameterCode } from "@/domain/types";
import { Loading, ParamDotGrid } from "@/ui/instruments";
import {
  Button,
  Card,
  InlineStatus,
  Label,
  PageHeader,
  SegmentedProgress,
  Value,
  statusColor,
} from "@/ui/primitives";

const STATUS_KEY: Record<string, string> = {
  OK: "status.OK",
  WARN: "status.WARN",
  FAIL: "status.FAIL",
  STALE: "status.STALE",
  MISSING: "status.MISSING",
};

function fmtDays(days: number): string {
  return `${days}D`;
}

export default function QualityPage() {
  const { snapshot, t, submitLabReport } = usePlant();
  const [param, setParam] = useState<ParameterCode>("IRON");
  const [value, setValue] = useState("");
  const [labName, setLabName] = useState("DWTL RANCHI");
  const [daysAgo, setDaysAgo] = useState("0");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);

  if (!snapshot) return <Loading text={t("common.loading")} />;

  const onSubmit = () => {
    setSaved(false);
    setError(false);
    let v: LabValue;
    const upper = value.trim().toUpperCase();
    if (upper === "DETECTED" || upper === "ABSENT") {
      v = upper;
    } else {
      const num = Number(upper);
      if (upper === "" || !Number.isFinite(num)) {
        setError(true);
        setShakeCount((c) => c + 1);
        return;
      }
      v = num;
    }
    const d = Number(daysAgo);
    if (daysAgo.trim() === "" || !Number.isFinite(d) || d < 0) {
      setError(true);
      setShakeCount((c) => c + 1);
      return;
    }
    const lab = labName.trim();
    if (lab === "") {
      setError(true);
      setShakeCount((c) => c + 1);
      return;
    }
    submitLabReport({
      parameter: param,
      value: v,
      lab,
      sampledAt: snapshot.at - d * 86_400_000,
    });
    setSaved(true);
    setValue("");
  };

  const inputCls =
    "w-full border-b border-border-visible bg-transparent py-2 font-mono text-[14px] text-primary outline-none focus:border-primary";

  return (
    <div>
      <PageHeader title={t("quality.title")} meta="BIS IS 10500:2012 · LIVE PROXY VS LAB-CONFIRMED" />

      {/* Parameter board — dot-matrix status grid */}
      <section className="mb-12">
        <ParamDotGrid
          cells={[
            ...LIVE_PARAMETERS.map((code) => {
              const spec = BIS_IS_10500[code];
              const reading = snapshot.live
                .filter((r) => r.code === code)
                .sort((a, b) => b.at - a.at)[0];
              if (!reading) throw new Error(`missing live reading: ${code}`);
              const status = evaluateLive(reading);
              return {
                code,
                label: spec.label,
                status,
                valueText: `${reading.value}${spec.unit ? ` ${spec.unit}` : ""}`,
              };
            }),
            ...LAB_PARAMETERS.map((code) => {
              const spec = BIS_IS_10500[code];
              const ev = evaluateEvidence(code, snapshot.labEvidence, snapshot.at);
              const v = ev.report?.value;
              return {
                code,
                label: spec.label,
                status: ev.status,
                valueText:
                  v === undefined
                    ? t("status.MISSING")
                    : typeof v === "number"
                      ? `${v}${spec.unit ? ` ${spec.unit}` : ""}`
                      : v,
              };
            }),
          ]}
        />
      </section>

      {/* Parameter ledger */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border-visible text-left">
              {[
                t("quality.col.parameter"),
                t("quality.col.sensing"),
                t("quality.col.value"),
                t("quality.col.limits"),
                t("quality.col.age"),
                t("quality.col.status"),
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-mono text-[11px] font-normal tracking-[0.08em] uppercase text-secondary ${
                    i === 2 ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIVE_PARAMETERS.map((code) => {
              const spec = BIS_IS_10500[code];
              const reading = snapshot.live
                .filter((r) => r.code === code)
                .sort((a, b) => b.at - a.at)[0];
              const status = reading ? evaluateLive(reading) : "MISSING";
              return (
                <tr
                  key={code}
                  className="border-b border-border transition-colors duration-200 ease-out hover:bg-surface-raised"
                >
                  <td className="px-4 py-3 font-sans text-[14px] text-primary">{spec.label}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-[4px] border border-border-visible px-2 py-0.5 font-mono text-[10px] uppercase text-secondary">
                      {t("quality.live")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[14px]">
                    <Value color={statusColor(status)}>
                      {reading ? `${reading.value}${spec.unit ? ` ${spec.unit}` : ""}` : "—"}
                    </Value>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-secondary">{thresholdText(spec)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-secondary">NOW</td>
                  <td className="px-4 py-3 font-mono text-[11px] uppercase">
                    <Value color={statusColor(status)}>{t(STATUS_KEY[status])}</Value>
                  </td>
                </tr>
              );
            })}
            {LAB_PARAMETERS.map((code) => {
              const spec = BIS_IS_10500[code];
              const ev = evaluateEvidence(code, snapshot.labEvidence, snapshot.at);
              const v = ev.report?.value;
              return (
                <tr
                  key={code}
                  className="border-b border-border transition-colors duration-200 ease-out hover:bg-surface-raised"
                >
                  <td className="px-4 py-3 font-sans text-[14px] text-primary">{spec.label}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-[4px] border border-border-visible px-2 py-0.5 font-mono text-[10px] uppercase text-secondary">
                      {t("quality.lab")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[14px]">
                    <Value color={statusColor(ev.status)}>
                      {v === undefined ? "—" : typeof v === "number" ? `${v}${spec.unit ? ` ${spec.unit}` : ""}` : v}
                    </Value>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-secondary">{thresholdText(spec)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-secondary">
                    {ev.ageDays !== undefined ? fmtDays(ev.ageDays) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] uppercase">
                    <Value color={statusColor(ev.status)}>{t(STATUS_KEY[ev.status])}</Value>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Freshness segmented bars */}
      <section className="mt-12 max-w-md space-y-5">
        <Label>{t("quality.freshness")}</Label>
        {LAB_PARAMETERS.filter((c) => BIS_IS_10500[c].freshnessHorizonDays).map((code) => {
          const spec = BIS_IS_10500[code];
          const ev = evaluateEvidence(code, snapshot.labEvidence, snapshot.at);
          const horizon = spec.freshnessHorizonDays ?? 30;
          const frac = ev.report ? Math.max(0, 1 - ev.ageDays! / horizon) : 0;
          const status = ev.status === "STALE" || ev.status === "MISSING" ? "over" : frac < 0.3 ? "moderate" : "good";
          return (
            <SegmentedProgress
              key={code}
              label={spec.label}
              valueText={ev.report ? `${ev.ageDays}D / ${horizon}D` : "—"}
              fraction={frac}
              status={status}
              size="compact"
            />
          );
        })}
      </section>

      {/* Lab report submission */}
      <section className="mt-12 max-w-xl">
        <Card className={error ? "t-input is-shaking" : ""} key={shakeCount}>
          <Label>{t("quality.submit.title")}</Label>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <Label>{t("quality.form.parameter")}</Label>
              <select
                value={param}
                onChange={(e) => setParam(e.target.value as ParameterCode)}
                className={`${inputCls} appearance-none`}
              >
                {LAB_PARAMETERS.map((c) => (
                  <option key={c} value={c} className="bg-surface text-primary">
                    {BIS_IS_10500[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("quality.form.value")}</Label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.8"
                className={inputCls}
              />
            </div>
            <div>
              <Label>{t("quality.form.lab")}</Label>
              <input value={labName} onChange={(e) => setLabName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>{t("quality.form.sampledDaysAgo")}</Label>
              <input
                value={daysAgo}
                onChange={(e) => setDaysAgo(e.target.value)}
                inputMode="numeric"
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Button variant="primary" onClick={onSubmit}>
              {t("common.submit")}
            </Button>
            {saved && <InlineStatus kind="saved">{t("common.saved")}</InlineStatus>}
            {error && <InlineStatus kind="error">[ERROR: BAD VALUE]</InlineStatus>}
          </div>
        </Card>
      </section>

    </div>
  );
}
