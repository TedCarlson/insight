"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

type Fiscal = { start_date: string; end_date: string; label?: string | null };

type Day = {
  date: string;
  quota_hours: number | null;
  quota_routes: number | null;
  scheduled_routes: number;
  scheduled_techs: number;
  total_headcount: number;
  util_pct: number | null;
  delta_forecast: number | null;
  has_sv: boolean;
  has_check_in: boolean;
};

type UnitMode = "routes" | "hours" | "units";

function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

function dayNum(iso: string): string {
  return iso.slice(8, 10);
}

function pillClassForDelta(delta: number | null) {
  // Option B (pill tint):
  // Δ = 0 → neutral (no tint)
  // Δ = +1..+2 → green
  // Δ > +2 → amber
  // Δ < 0 → red
  if (delta === null) return "bg-[var(--to-surface-2)] border-[var(--to-border)]";
  if (delta === 0) return "bg-[var(--to-surface-2)] border-[var(--to-border)]";
  if (delta >= 1 && delta <= 2) return "bg-[rgba(16,185,129,0.16)] border-[rgba(16,185,129,0.35)]";
  if (delta > 2) return "bg-[rgba(234,179,8,0.18)] border-[rgba(234,179,8,0.40)]";
  return "bg-[rgba(239,68,68,0.20)] border-[rgba(239,68,68,0.45)]";
}

function tooltipForDay(d: Day) {
  const lines: string[] = [];

  if (d.quota_routes == null) {
    lines.push("Quota: missing (no demand target set)");
    lines.push("Action: add quota for this fiscal month/day.");
  } else {
    const delta = d.delta_forecast;
    const q = d.quota_routes;
    const on = d.scheduled_routes;

    lines.push(`On (Scheduled): ${on}`);
    lines.push(`Quota (Lock): ${q}`);

    if (delta == null) {
      lines.push("Δ: — (cannot compute)");
    } else if (delta < 0) {
      lines.push(`Δ: ${delta}  → SHORT`);
      lines.push(`Action: add ${Math.abs(delta)} route(s) / tech-day(s) or adjust quota.`);
    } else if (delta === 0) {
      lines.push("Δ: 0  → MEETS (no cushion)");
      lines.push("Note: consider +1 to +2 buffer to cover call-outs.");
    } else if (delta >= 1 && delta <= 2) {
      lines.push(`Δ: +${delta}  → BUFFERED (good)`);
    } else {
      lines.push(`Δ: +${delta}  → EXCEEDS (over plan)`);
      lines.push("Action: tighten schedule unless customer requests additional coverage.");
    }
  }

  if (d.total_headcount) {
    const util = d.util_pct == null ? "—" : `${d.util_pct}%`;
    lines.push(`HC: ${d.scheduled_techs}/${d.total_headcount} (${util})`);
  }

  lines.push(`Shift Validation: ${d.has_sv ? "present (V)" : "missing"}`);
  lines.push(`Check-In: ${d.has_check_in ? "present (C)" : "not available"}`);

  return lines.join("\n");
}

function fmt(mode: UnitMode, routes: number | null, hours: number | null, units: number | null): string {
  if (mode === "routes") return routes === null ? "—" : String(routes);
  if (mode === "hours") return hours === null ? "—" : String(hours);
  return units === null ? "—" : String(units);
}

export function RouteLockCalendarClient(props: { fiscal: Fiscal; days: Day[] }) {
  const [mode, setMode] = useState<UnitMode>("routes");

  const byWeek = useMemo(() => {
    // Build weeks starting on Sunday.
    const days = props.days;
    if (!days.length) return [];

    const start = new Date(`${days[0].date}T00:00:00Z`);
    const pad = start.getUTCDay(); // 0=Sun
    const padded: Array<Day | null> = Array.from({ length: pad }).map(() => null);

    const all = [...padded, ...days];

    const weeks: Array<Array<Day | null>> = [];
    for (let i = 0; i < all.length; i += 7) {
      weeks.push(all.slice(i, i + 7));
    }
    return weeks;
  }, [props.days]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Fiscal Month Calendar</div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              Shows dataset coverage + forecast readiness (Option B). Check-In will light up the C chip in Phase 2.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="to-input h-8 text-xs"
              value={mode}
              onChange={(e) => setMode(e.target.value as UnitMode)}
            >
              <option value="routes">Routes</option>
              <option value="hours">Hours</option>
              <option value="units">Units</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--to-border)] bg-[var(--to-surface-2)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-medium text-[var(--to-ink-muted)]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid gap-0">
          {byWeek.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((d, di) => {
                if (!d) {
                  return <div key={di} className="min-h-[108px] border-b border-r border-[var(--to-border)]" />;
                }

                const quotaHours = d.quota_hours;
                const quotaRoutes = d.quota_routes;
                const quotaUnits = quotaHours ? quotaHours * 12 : null;

                const scheduledRoutes = d.scheduled_routes;
                const scheduledHours = scheduledRoutes * 8;
                const scheduledUnits = scheduledHours * 12;

                const delta = d.delta_forecast;
                const deltaDisplay =
                  delta === null ? "—" : delta === 0 ? "0" : delta > 0 ? `+${delta}` : String(delta);

                const hc =
                  d.total_headcount ? `${d.scheduled_techs}/${d.total_headcount}` : `${d.scheduled_techs}/—`;
                const util = d.util_pct === null ? "—" : `${d.util_pct}%`;

                return (
                  <div
                    key={d.date}
                    className="min-h-[108px] border-b border-r border-[var(--to-border)] px-3 py-2 bg-transparent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        title={tooltipForDay(d)}
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          "border",
                          pillClassForDelta(delta),
                        ].join(" ")}
                      >
                        <span>{dayNum(d.date)}</span>
                        <span className="text-[var(--to-ink-muted)] font-normal">{weekdayShort(d.date)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px]">
                        {d.has_sv ? (
                          <span className="rounded px-1.5 py-0.5 border border-[var(--to-border)]">V</span>
                        ) : null}
                        {d.has_check_in ? (
                          <span className="rounded px-1.5 py-0.5 border border-[var(--to-border)]">C</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-xs tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-[var(--to-ink-muted)]">On</span>
                        <span>{fmt(mode, scheduledRoutes, scheduledHours, scheduledUnits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--to-ink-muted)]">Quota</span>
                        <span>{fmt(mode, quotaRoutes, quotaHours, quotaUnits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--to-ink-muted)]">Δ</span>
                        <span className="font-medium">{deltaDisplay}</span>
                      </div>

                      <div className="flex justify-between pt-1">
                        <span className="text-[var(--to-ink-muted)]">HC</span>
                        <span>
                          {hc} <span className="text-[var(--to-ink-muted)]">({util})</span>
                        </span>
                      </div>

                      {delta === 0 ? (
                        <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">MEETS (no cushion)</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}