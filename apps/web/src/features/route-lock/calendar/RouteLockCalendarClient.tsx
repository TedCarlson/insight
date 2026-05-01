// path: apps/web/src/features/route-lock/calendar/RouteLockCalendarClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

type Fiscal = { start_date: string; end_date: string; label?: string | null };

type Day = {
  date: string;
  quota_hours: number | null;
  quota_routes: number | null;
  quota_units: number | null;

  scheduled_routes: number;
  scheduled_techs: number;
  planned_field_count?: number | null;
  planned_travel_count?: number | null;

  total_headcount: number;
  util_pct: number | null;
  delta_forecast: number | null;

  has_sv: boolean;
  has_check_in: boolean;

  actual_techs: number | null;
  actual_units: number | null;
  actual_hours: number | null;
  actual_jobs: number | null;

  work_count?: number | null;
  bplow_count?: number | null;
  prjt_count?: number | null;
  trvl_count?: number | null;
  bptrl_count?: number | null;
};

type UnitMode = "routes" | "hours" | "units";
type DayState = "planned" | "built" | "actual";
type LockVerdict = "MET" | "MISS" | "NA";

function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

function n(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function count(v: unknown): number {
  return n(v) ?? 0;
}

function fmt(v: number | null): string {
  if (v === null) return "—";
  return String(Math.round(v * 10) / 10);
}

function fmtWhole(v: number | null): string {
  if (v === null) return "—";
  return String(Math.round(v));
}

function fmtDelta(v: number | null): string {
  if (v === null) return "—";
  const rounded = Math.round(v * 10) / 10;
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 10) / 10}%`;
}

function safePct(num: number, den: number | null): number | null {
  if (!den) return null;
  const p = (num / den) * 100;
  if (!Number.isFinite(p)) return null;
  return Math.round(p * 10) / 10;
}

function stateForDay(d: Day): DayState {
  if (d.has_check_in) return "actual";
  if (d.has_sv) return "built";
  return "planned";
}

function stateLabel(state: DayState): string {
  if (state === "actual") return "Actual";
  if (state === "built") return "Built";
  return "Planned";
}

function multiplier(mode: UnitMode): number {
  if (mode === "hours") return 8;
  if (mode === "units") return 96;
  return 1;
}

function quotaForMode(d: Day, mode: UnitMode): number | null {
  if (mode === "routes") return n(d.quota_routes);
  if (mode === "hours") return n(d.quota_hours);
  return n(d.quota_units) ?? (n(d.quota_hours) === null ? null : count(d.quota_hours) * 12);
}

function deltaTone(delta: number | null) {
  if (delta === null || delta === 0) return "text-[var(--to-ink-muted)]";
  if (delta > 0) return "text-[rgba(16,185,129,0.95)]";
  return "text-[rgba(239,68,68,0.95)]";
}

function verdictTone(verdict: LockVerdict) {
  if (verdict === "MET") return "text-[rgba(16,185,129,0.95)]";
  if (verdict === "MISS") return "text-[rgba(239,68,68,0.95)]";
  return "text-[var(--to-ink-muted)]";
}

function computeVerdict(args: {
  lockRoutes: number | null;
  quotaRoutes: number | null;
  actualUnits: number | null;
  quotaUnits: number | null;
}): LockVerdict {
  const { lockRoutes, quotaRoutes, actualUnits, quotaUnits } = args;

  if (quotaRoutes === null || lockRoutes === null) return "NA";
  if (lockRoutes >= quotaRoutes) return "MET";

  if (
    lockRoutes >= quotaRoutes * 0.9 &&
    quotaUnits !== null &&
    actualUnits !== null &&
    actualUnits >= quotaUnits
  ) {
    return "MET";
  }

  return "MISS";
}

export function RouteLockCalendarClient(props: {
  fiscal: Fiscal;
  days: Day[];
  todayIso: string;
  prevHref?: string | null;
  currentHref?: string | null;
  nextHref?: string | null;
}) {
  const [mode, setMode] = useState<UnitMode>("routes");

  const fiscalLabel =
    props.fiscal.label ?? `Fiscal ${props.fiscal.start_date} → ${props.fiscal.end_date}`;

  const rows = useMemo(() => {
    const m = multiplier(mode);

    return props.days.map((d) => {
      const state = stateForDay(d);

      const work = count(d.work_count);
      const bplow = count(d.bplow_count);
      const prjt = count(d.prjt_count);
      const trvl = count(d.trvl_count);
      const bptrl = count(d.bptrl_count);

      const quotaRoutes = n(d.quota_routes);
      const quota = quotaForMode(d, mode);
      const quotaUnits =
        n(d.quota_units) ??
        (n(d.quota_hours) === null ? null : count(d.quota_hours) * 12);

      const plannedFieldRoutes = count(d.planned_field_count ?? d.scheduled_routes);
      const plannedTravelRoutes = count(d.planned_travel_count);
      const plannedTotalRoutes = plannedFieldRoutes + plannedTravelRoutes;

      const plannedLockRoutes = plannedFieldRoutes;
      const plannedRunRoutes = plannedTotalRoutes;

      const builtLockRoutes = work + bplow + prjt;
      const builtRunRoutes = work + bplow + prjt + trvl + bptrl;

      const actualTechs = n(d.actual_techs);
      const actualLockRoutes =
        actualTechs === null ? null : actualTechs - trvl - bptrl + bplow + prjt;
      const actualRunRoutes =
        actualTechs === null ? null : actualTechs + bplow + prjt;

      const activeLockRoutes =
        state === "actual"
          ? actualLockRoutes
          : state === "built"
            ? builtLockRoutes
            : plannedLockRoutes;

      const activeRunRoutes =
        state === "actual"
          ? actualRunRoutes
          : state === "built"
            ? builtRunRoutes
            : plannedRunRoutes;

      const activeLock = activeLockRoutes === null ? null : activeLockRoutes * m;
      const activeRun = activeRunRoutes === null ? null : activeRunRoutes * m;

      const net = quota === null || activeLock === null ? null : activeLock - quota;
      const runRatePct = safePct(activeRun ?? activeLock ?? 0, quota);

      const verdict = computeVerdict({
        lockRoutes: activeLockRoutes,
        quotaRoutes,
        actualUnits: state === "actual" ? n(d.actual_units) : null,
        quotaUnits,
      });

      return {
        day: d,
        state,
        quota,
        plannedLock: plannedLockRoutes * m,
        plannedTravel: plannedTravelRoutes * m,
        plannedRun: plannedRunRoutes * m,
        builtLock: builtLockRoutes * m,
        builtRun: builtRunRoutes * m,
        actualLock: actualLockRoutes === null ? null : actualLockRoutes * m,
        actualRun: actualRunRoutes === null ? null : actualRunRoutes * m,
        activeLock,
        activeRun,
        net,
        runRatePct,
        work,
        bplow,
        prjt,
        trvl,
        bptrl,
        verdict,
      };
    });
  }, [props.days, mode]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Route Lock • {fiscalLabel}</div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              Quota → planned schedule → built validation → actual check-in.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="to-input h-8 text-xs"
              value={mode}
              onChange={(e) => setMode(e.target.value as UnitMode)}
            >
              <option value="routes">Routes</option>
              <option value="hours">Hours</option>
              <option value="units">Points</option>
            </select>

            {props.prevHref ? (
              <Link href={props.prevHref} className="to-btn to-btn--secondary h-8 px-3 text-xs">
                Previous
              </Link>
            ) : null}

            {props.currentHref ? (
              <Link href={props.currentHref} className="to-btn to-btn--secondary h-8 px-3 text-xs">
                Current
              </Link>
            ) : null}

            {props.nextHref ? (
              <Link href={props.nextHref} className="to-btn to-btn--secondary h-8 px-3 text-xs">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[620px] overflow-y-auto">
            <table className="min-w-[1540px] table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-background text-xs text-[var(--to-ink-muted)] shadow-sm">
                <tr>
                  {[
                    ["Date", "w-[150px] text-left"],
                    ["State", "w-[82px] text-left"],
                    ["Quota", "w-[76px] text-right border-r"],
                    ["Plan Lock", "w-[88px] text-right"],
                    ["Plan Travel", "w-[92px] text-right"],
                    ["Plan Run", "w-[84px] text-right border-r"],
                    ["Built Lock", "w-[90px] text-right"],
                    ["Built Run", "w-[86px] text-right border-r"],
                    ["Actual Lock", "w-[94px] text-right"],
                    ["Actual Run", "w-[90px] text-right border-r"],
                    ["Net", "w-[62px] text-right"],
                    ["WORK", "w-[62px] text-right"],
                    ["BPLOW", "w-[66px] text-right"],
                    ["PRJT", "w-[62px] text-right"],
                    ["TRVL", "w-[62px] text-right"],
                    ["BPTRL", "w-[66px] text-right"],
                    ["Run Rate", "w-[82px] text-right"],
                    ["SV", "w-[48px] text-left"],
                    ["Check-In", "w-[76px] text-left"],
                    ["Lock", "w-[62px] text-left"],
                  ].map(([label, cls]) => (
                    <th
                      key={label}
                      className={`border-b border-[var(--to-border)] bg-background px-3 py-3 ${cls}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const d = row.day;
                  const isToday = d.date === props.todayIso;

                  return (
                    <tr
                      key={d.date}
                      className={[
                        "border-b hover:bg-muted/30",
                        isToday ? "bg-[rgba(59,130,246,0.07)]" : "",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 font-medium tabular-nums">
                        {d.date}{" "}
                        <span className="text-[var(--to-ink-muted)]">
                          {weekdayShort(d.date)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{stateLabel(row.state)}</td>
                      <td className="border-r px-3 py-2 text-right tabular-nums">
                        {fmtWhole(row.quota)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.plannedLock)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.plannedTravel}</td>
                      <td className="border-r px-3 py-2 text-right tabular-nums">
                        {fmt(row.plannedRun)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.builtLock)}</td>
                      <td className="border-r px-3 py-2 text-right tabular-nums">
                        {fmt(row.builtRun)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.actualLock)}</td>
                      <td className="border-r px-3 py-2 text-right tabular-nums">
                        {fmt(row.actualRun)}
                      </td>
                      <td
                        className={[
                          "px-3 py-2 text-right font-medium tabular-nums",
                          deltaTone(row.net),
                        ].join(" ")}
                      >
                        {fmtDelta(row.net)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.work}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.bplow}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.prjt}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.trvl}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.bptrl}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtPct(row.runRatePct)}
                      </td>
                      <td className="px-3 py-2">{d.has_sv ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{d.has_check_in ? "Yes" : "No"}</td>
                      <td
                        className={[
                          "px-3 py-2 font-semibold",
                          verdictTone(row.verdict),
                        ].join(" ")}
                      >
                        {row.verdict === "NA" ? "—" : row.verdict}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}