"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  FlaskConical,
  Gauge,
  Moon,
  Presentation,
  SlidersHorizontal,
  Sun,
  Workflow,
  Wrench,
} from "lucide-react";
import { usePlant } from "@/data/PlantProvider";
import { Loading } from "./instruments";
import { Label, Value } from "./primitives";

const NAV = [
  { href: "/", key: "nav.pitch", icon: Presentation },
  { href: "/plant", key: "nav.plant", icon: Gauge },
  { href: "/plant/twin", key: "nav.twin", icon: Workflow },
  { href: "/plant/quality", key: "nav.quality", icon: FlaskConical },
  { href: "/plant/incidents", key: "nav.incidents", icon: AlertTriangle },
  { href: "/plant/maintenance", key: "nav.maintenance", icon: Wrench },
  { href: "/plant/impact", key: "nav.impact", icon: BarChart3 },
  { href: "/demo", key: "nav.demo", icon: SlidersHorizontal },
];

function fmtAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}S`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}M`;
  return `${Math.floor(m / 60)}H`;
}

function SyncStrip() {
  const { snapshot, t } = usePlant();
  if (!snapshot) return <Loading text={t("common.loading")} />;
  const c = snapshot.connectivity;
  return (
    <span className="font-mono text-[11px] tracking-[0.06em] uppercase whitespace-nowrap">
      {c.online ? (
        <Value color="secondary">
          [ {t("common.online")} · {t("common.synced")} {fmtAge(snapshot.at - c.lastSyncAt)} {t("common.ago")} ]
        </Value>
      ) : (
        <Value color="warning">
          [ {t("common.offline")} · {c.queuedEvents} {t("common.queued")} ]
        </Value>
      )}
    </span>
  );
}

function ReleaseStrip() {
  const { snapshot, t } = usePlant();
  if (!snapshot) return null;
  const state = snapshot.release.state;
  const color =
    state === "HOLD" ? "text-accent" : state === "SAFE" ? "text-success" : state === "CONDITIONAL" ? "text-warning" : "text-secondary";
  return (
    <Link
      href="/plant/incidents"
      className="flex items-center justify-center gap-2 border-b border-border py-1.5 md:hidden"
    >
      <span className={`font-mono text-[11px] tracking-[0.08em] uppercase ${color}`}>
        {t(`release.${state}`)} — {t("common.viewWhy")}
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t, lang, setLang, theme, setTheme, snapshot } = usePlant();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="font-mono text-[14px] font-bold tracking-[0.08em] text-display">
            NEER//OS
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`nd-navlink font-mono text-[11px] tracking-[0.08em] uppercase ${
                    active ? "text-display" : "text-disabled hover:text-secondary"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <SyncStrip />
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="min-h-11 min-w-11 font-mono text-[11px] tracking-[0.08em] uppercase text-secondary hover:text-display"
              aria-label="language"
            >
              {lang === "en" ? "हिंदी" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}
              className="flex min-h-11 min-w-11 items-center justify-center text-secondary hover:text-display"
              aria-label={`theme: ${theme}`}
            >
              {theme === "light" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        <ReleaseStrip />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 md:px-6 md:pb-16">
        {children}
      </main>

      <footer className="hidden border-t border-border py-4 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <Label>SIH26040 · GOVT OF JHARKHAND</Label>
          <Label>{t("common.seededDemo")}</Label>
          <Label>{snapshot ? `TICK ${snapshot.at}` : ""}</Label>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-canvas md:hidden">
        <div className="flex items-stretch justify-between overflow-x-auto">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 px-3 transition-colors duration-200 ease-out ${
                  active ? "text-display" : "text-disabled"
                }`}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span className="font-mono text-[9px] tracking-[0.06em] uppercase">
                  {t(n.key)}
                </span>
                {active && <span className="nd-in h-1 w-1 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
