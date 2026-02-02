// apps/web/src/app/route-lock/schedule/ScheduleGridClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";

type Technician = {
  assignment_id: string;
  tech_id: string;
  full_name: string;
};

type RouteRow = { route_id: string; route_name: string };

type ScheduleRow = {
  schedule_id: string;
  assignment_id: string;
  start_date: string;
  end_date: string | null;
  default_route_id: string | null;
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

type RowState = {
  assignmentId: string;
  techId: string;
  name: string;
  routeId: string; // "" means unset
  days: Record<DayKey, boolean>;
};

export type ScheduleTotals = {
  techs: number;
  perDay: Record<DayKey, number>;
  totalDaysOn: number;
  totalHours: number;
  totalUnits: number;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function DayToggle({
  dayLabel,
  value,
  onToggle,
}: {
  dayLabel: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cls(
        "to-pill w-full text-center select-none",
        value
          ? "border-[var(--to-success)] text-[var(--to-success)] bg-[var(--to-toggle-active-bg)]"
          : "border-[var(--to-warning)] text-[var(--to-warning)] bg-[var(--to-surface-soft)]"
      )}
      aria-pressed={value}
    >
      {value ? dayLabel : "Off"}
    </button>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeFromScheduleRow(s?: ScheduleRow) {
  // Schedule rows use nullable booleans; null means "default ON" in your existing UI logic
  return {
    routeId: String(s?.default_route_id ?? ""),
    days: {
      sun: s?.sun ?? true,
      mon: s?.mon ?? true,
      tue: s?.tue ?? true,
      wed: s?.wed ?? true,
      thu: s?.thu ?? true,
      fri: s?.fri ?? true,
      sat: s?.sat ?? true,
    } as Record<DayKey, boolean>,
  };
}

function rowsEqual(a: RowState, b: { routeId: string; days: Record<DayKey, boolean> }) {
  if (a.routeId !== b.routeId) return false;
  for (const d of DAYS) {
    if (a.days[d.key] !== b.days[d.key]) return false;
  }
  return true;
}

export function ScheduleGridClient({
  technicians,
  routes,
  scheduleByAssignment,
  defaults,
  onTotalsChange,
}: {
  technicians: Technician[];
  routes: RouteRow[];
  scheduleByAssignment: Record<string, ScheduleRow>;
  defaults: { unitsPerHour: number; hoursPerDay: number };
  onTotalsChange?: (t: ScheduleTotals) => void;
}) {
  // Effective date for the rolling baseline write
  const [startDate, setStartDate] = useState<string>(isoToday());

  const [rows, setRows] = useState<RowState[]>(() => {
    return technicians.map((t) => {
      const s = scheduleByAssignment[t.assignment_id];
      const norm = normalizeFromScheduleRow(s);
      return {
        assignmentId: t.assignment_id,
        techId: t.tech_id,
        name: t.full_name,
        routeId: norm.routeId,
        days: norm.days,
      };
    });
  });

  // Baseline snapshot used for dirty detection (initialized once)
  const baselineRef = useRef<Record<string, { routeId: string; days: Record<DayKey, boolean> }> | null>(null);

  if (baselineRef.current === null) {
    const snap: Record<string, { routeId: string; days: Record<DayKey, boolean> }> = {};
    for (const t of technicians) {
      const s = scheduleByAssignment[t.assignment_id];
      snap[t.assignment_id] = normalizeFromScheduleRow(s);
    }
    baselineRef.current = snap;
  }

  const totals = useMemo<ScheduleTotals>(() => {
    const perDay: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    let totalDaysOn = 0;

    for (const r of rows) {
      for (const d of DAYS) {
        if (r.days[d.key]) {
          perDay[d.key] += 1;
          totalDaysOn += 1;
        }
      }
    }

    const totalHours = totalDaysOn * defaults.hoursPerDay;
    const totalUnits = totalHours * defaults.unitsPerHour;

    return {
      techs: rows.length,
      perDay,
      totalDaysOn,
      totalHours,
      totalUnits,
    };
  }, [rows, defaults.hoursPerDay, defaults.unitsPerHour]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const dirtyRows = useMemo(() => {
    const base = baselineRef.current ?? {};
    return rows.filter((r) => {
      const b = base[r.assignmentId];
      if (!b) return true; // new/unknown assignment => treat as dirty
      return !rowsEqual(r, b);
    });
  }, [rows]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string>("");
  const toast = useToast();

  async function commitChanges() {
    setSaveMsg("");
    if (dirtyRows.length === 0) {
      setSaveMsg("No changes to commit.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        start_date: startDate,
        hoursPerDay: defaults.hoursPerDay,
        unitsPerHour: defaults.unitsPerHour,
        rows: dirtyRows.map((r) => ({
          assignment_id: r.assignmentId,
          default_route_id: r.routeId ? r.routeId : null,
          days: r.days,
        })),
      };

      const res = await fetch("/api/route-lock/schedule/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const err = String(json?.error ?? `Commit failed (${res.status})`);
        setSaveMsg(err);
        return;
      }

      // Update baseline snapshot to the new committed state so dirty clears
      const nextBase: Record<string, { routeId: string; days: Record<DayKey, boolean> }> = {};
      for (const r of rows) {
        nextBase[r.assignmentId] = { routeId: r.routeId, days: { ...r.days } };
      }
      baselineRef.current = nextBase;

      toast.push({
        variant: "success",
        title: "Schedule committed",
        message: `Committed ${dirtyRows.length} row(s).`,
        durationMs: 1800,
      });

  // Navigate right away — toast persists across routes because ToastProvider is global.
  window.location.href = "/route-lock";
      } catch (e: any) {
        setSaveMsg(String(e?.message ?? "Commit failed"));
      } finally {
        setIsSaving(false);
      }
    }

  const gridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: "6rem minmax(12rem,1fr) 12rem repeat(7, 5.5rem) minmax(16rem, 0.9fr)",
      }) as const,
    []
  );

  return (
    <Card>
      {/* Top action bar */}
      <div className="flex flex-col gap-2 p-3 border-b border-[var(--to-border)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-[var(--to-ink-muted)]">Effective start date</div>
            <input
              className="to-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs text-[var(--to-ink-muted)]">Dirty rows</div>
            <div className="text-sm font-medium">{dirtyRows.length}</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className={cls("to-btn", dirtyRows.length ? "to-btn--secondary" : "to-btn--secondary")}
              disabled={isSaving || dirtyRows.length === 0}
              onClick={commitChanges}
              aria-disabled={isSaving || dirtyRows.length === 0}
            >
              {isSaving ? "Committing…" : "Commit changes"}
            </button>
          </div>
        </div>

        {saveMsg ? <div className="text-sm text-[var(--to-ink-muted)]">{saveMsg}</div> : null}
        <div className="text-xs text-[var(--to-ink-muted)]">
          Commits only changed rows. Rolling baseline: prior open row closes, new row opens with end_date NULL.
        </div>
      </div>

      {/* Totals row */}
      <DataTableRow gridStyle={gridStyle}>
        <div className="whitespace-nowrap font-medium"></div>
        <div className="min-w-0 font-medium"></div>
        <div className="min-w-0 font-medium">Scheduled Totals</div>

        {DAYS.map((d) => (
          <div key={d.key} className="text-center">
            <span className="text-sm font-medium">{totals.perDay[d.key]}</span>
          </div>
        ))}

        <div />
      </DataTableRow>

      <DataTable layout="fixed" gridStyle={gridStyle}>
        <DataTableHeader gridStyle={gridStyle}>
          <div className="whitespace-nowrap">Tech Id</div>
          <div className="min-w-0">Name</div>
          <div className="whitespace-nowrap">Route</div>
          {DAYS.map((d) => (
            <div key={d.key} className="text-center whitespace-nowrap">
              {d.label}
            </div>
          ))}
          <div className="whitespace-nowrap">Stats</div>
        </DataTableHeader>

        <DataTableBody zebra>
          {rows.map((r) => {
            const daysOn = Object.values(r.days).reduce((acc, v) => acc + (v ? 1 : 0), 0);
            const hours = daysOn * defaults.hoursPerDay;
            const units = hours * defaults.unitsPerHour;

            return (
              <DataTableRow key={r.assignmentId} gridStyle={gridStyle}>
                <div className="whitespace-nowrap">{r.techId}</div>
                <div className="min-w-0 truncate">{r.name}</div>

                <div>
                  <select
                    className="to-select"
                    value={r.routeId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x) => (x.assignmentId === r.assignmentId ? { ...x, routeId: v } : x))
                      );
                    }}
                  >
                    <option value="">—</option>
                    {routes.map((rt) => (
                      <option key={rt.route_id} value={rt.route_id}>
                        {rt.route_name}
                      </option>
                    ))}
                  </select>
                </div>

                {DAYS.map((d) => (
                  <div key={d.key} className="text-center">
                    <DayToggle
                      dayLabel={d.label}
                      value={r.days[d.key]}
                      onToggle={() => {
                        setRows((prev) =>
                          prev.map((x) =>
                            x.assignmentId === r.assignmentId
                              ? { ...x, days: { ...x.days, [d.key]: !x.days[d.key] } }
                              : x
                          )
                        );
                      }}
                    />
                  </div>
                ))}

                <div className="text-sm flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{daysOn}</span> {daysOn === 1 ? "day" : "days"} •{" "}
                    <span className="font-medium">{units}</span> units •{" "}
                    <span className="font-medium">{hours}</span> hours
                  </div>

                  <button
                    type="button"
                    className="to-btn to-btn--secondary px-2 py-1"
                    onClick={() => {
                      // "Remove" = clear route + turn all days off (counts as dirty)
                      setRows((prev) =>
                        prev.map((x) =>
                          x.assignmentId === r.assignmentId
                            ? {
                                ...x,
                                routeId: "",
                                days: { sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false },
                              }
                            : x
                        )
                      );
                    }}
                  >
                    Remove
                  </button>
                </div>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </Card>
  );
}