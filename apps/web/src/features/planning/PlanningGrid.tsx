"use client";

import { useMemo, useState } from "react";

type PlanningMemberRow = {
  person_pc_org_id: string;
  person_id: string;
  pc_org_id: string;

  full_name: string | null;
  person_role: string | null;
  person_active: boolean | null;

  membership_status: string | null;
  membership_active: boolean | null;

  position_title: string | null;
  assignment_id: string | null;
};

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAYS)[number];

const DAY_LABEL: Record<DayKey, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

const HOURS_PER_ON_DAY = 8;
const UNITS_PER_HOUR = 12;
const UNITS_PER_ON_DAY = HOURS_PER_ON_DAY * UNITS_PER_HOUR;

type Metric = "hours" | "units" | "techs";

function metricLabel(m: Metric) {
  if (m === "hours") return "Hours";
  if (m === "units") return "Units";
  return "Techs";
}

function metricValueForDay(on: boolean, metric: Metric) {
  if (!on) return 0;
  if (metric === "hours") return HOURS_PER_ON_DAY;
  if (metric === "units") return UNITS_PER_ON_DAY;
  return 1; // techs
}

function TogglePill(props: { on: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs",
        props.on
          ? "border-green-600/40 bg-green-600/10 text-green-900"
          : "border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)]",
        props.disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {/* Confirmed display rule:
          - planned=true => show weekday label
          - planned=false => show "Off"
      */}
      {props.on ? props.label : "Off"}
    </button>
  );
}

function MetricPill(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs",
        props.active
          ? "border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink)]"
          : "border-[var(--to-border)] bg-[var(--to-surface)] text-[var(--to-ink-muted)] hover:bg-[var(--to-surface-soft)]",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

function safeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ScheduleSeed = {
  schedule_id: string;
  assignment_id: string;
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

type Props = {
  pcOrgId: string;
  rows: PlanningMemberRow[];

  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  scheduleName: string;

  scheduleSeeds: ScheduleSeed[];
};

// STEP 1.3: flat quota placeholder (straight comparison)
// Change this later when we wire real imports.
const QUOTA_TECHS_PER_DAY = 10;

export function PlanningGrid(props: Props) {
  const [metric, setMetric] = useState<Metric>("techs"); // default: Techs (confirmed)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const scheduleIdByAssignment = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of props.scheduleSeeds) {
      map[s.assignment_id] = s.schedule_id;
    }
    return map;
  }, [props.scheduleSeeds]);

  const initialByMembership = useMemo(() => {
    const byAssignmentDays: Record<string, Record<DayKey, boolean>> = {};
    for (const s of props.scheduleSeeds) {
      byAssignmentDays[s.assignment_id] = {
        sun: Boolean(s.sun),
        mon: Boolean(s.mon),
        tue: Boolean(s.tue),
        wed: Boolean(s.wed),
        thu: Boolean(s.thu),
        fri: Boolean(s.fri),
        sat: Boolean(s.sat),
      };
    }

    const seed: Record<string, Record<DayKey, boolean>> = {};
    for (const r of props.rows) {
      const assignmentId = r.assignment_id ?? null;

      // default behavior (no existing schedule): default = On for all days
      const defaultDays: Record<DayKey, boolean> = {
        sun: true,
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
      };

      seed[r.person_pc_org_id] =
        assignmentId && byAssignmentDays[assignmentId] ? byAssignmentDays[assignmentId] : defaultDays;
    }

    return seed;
  }, [props.rows, props.scheduleSeeds]);

  const [byMembership, setByMembership] = useState<Record<string, Record<DayKey, boolean>>>(initialByMembership);

  const plannedTotalsByDay = useMemo(() => {
    const out: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };

    for (const r of props.rows) {
      // Do not count rows that cannot be scheduled (no assignment)
      if (!r.assignment_id) continue;

      const row = byMembership[r.person_pc_org_id];
      if (!row) continue;

      for (const d of DAYS) {
        out[d] += metricValueForDay(Boolean(row[d]), metric);
      }
    }

    return out;
  }, [props.rows, byMembership, metric]);

  const plannedWeekTotal = useMemo(() => {
    let sum = 0;

    for (const r of props.rows) {
      if (!r.assignment_id) continue;

      const row = byMembership[r.person_pc_org_id];
      if (!row) continue;

      for (const d of DAYS) {
        sum += metricValueForDay(Boolean(row[d]), metric);
      }
    }

    return sum;
  }, [props.rows, byMembership, metric]);

  // STEP 1.3: quota placeholder derived from a flat Techs/day target
  const quotaTotalsByDay = useMemo(() => {
    const out: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };

    const dailyTechs = QUOTA_TECHS_PER_DAY;

    for (const d of DAYS) {
      if (metric === "techs") out[d] = dailyTechs;
      else if (metric === "hours") out[d] = dailyTechs * HOURS_PER_ON_DAY;
      else out[d] = dailyTechs * UNITS_PER_ON_DAY;
    }

    return out;
  }, [metric]);

  const quotaWeekTotal = useMemo(() => {
    return DAYS.reduce((sum, d) => sum + quotaTotalsByDay[d], 0);
  }, [quotaTotalsByDay]);

  const varianceByDay = useMemo(() => {
    const out: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    for (const d of DAYS) out[d] = plannedTotalsByDay[d] - quotaTotalsByDay[d];
    return out;
  }, [plannedTotalsByDay, quotaTotalsByDay]);

  const varianceWeek = plannedWeekTotal - quotaWeekTotal;

  async function save() {
    setSaveState("saving");
    setSaveError(null);

    const { createClient } = await import("@/app/(prod)/_shared/supabase");
    const supabase = createClient();

    const rowsToWrite: any[] = [];

    for (const r of props.rows) {
      const assignmentId = r.assignment_id ?? null;
      if (!assignmentId) continue;

      const days = byMembership[r.person_pc_org_id];
      const scheduleId = scheduleIdByAssignment[assignmentId] ?? safeUuid();

      const sun = Boolean(days?.sun);
      const mon = Boolean(days?.mon);
      const tue = Boolean(days?.tue);
      const wed = Boolean(days?.wed);
      const thu = Boolean(days?.thu);
      const fri = Boolean(days?.fri);
      const sat = Boolean(days?.sat);

      const hs = { hours: sun ? HOURS_PER_ON_DAY : 0, units: sun ? UNITS_PER_ON_DAY : 0 };
      const hm = { hours: mon ? HOURS_PER_ON_DAY : 0, units: mon ? UNITS_PER_ON_DAY : 0 };
      const ht = { hours: tue ? HOURS_PER_ON_DAY : 0, units: tue ? UNITS_PER_ON_DAY : 0 };
      const hw = { hours: wed ? HOURS_PER_ON_DAY : 0, units: wed ? UNITS_PER_ON_DAY : 0 };
      const hth = { hours: thu ? HOURS_PER_ON_DAY : 0, units: thu ? UNITS_PER_ON_DAY : 0 };
      const hf = { hours: fri ? HOURS_PER_ON_DAY : 0, units: fri ? UNITS_PER_ON_DAY : 0 };
      const hsa = { hours: sat ? HOURS_PER_ON_DAY : 0, units: sat ? UNITS_PER_ON_DAY : 0 };

      rowsToWrite.push({
        schedule_id: scheduleId,
        assignment_id: assignmentId,
        schedule_name: props.scheduleName,
        start_date: props.weekStart,
        end_date: props.weekEnd,
        default_route_id: null,

        sun,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,

        sch_hours_sun: hs.hours,
        sch_hours_mon: hm.hours,
        sch_hours_tue: ht.hours,
        sch_hours_wed: hw.hours,
        sch_hours_thu: hth.hours,
        sch_hours_fri: hf.hours,
        sch_hours_sat: hsa.hours,

        sch_units_sun: hs.units,
        sch_units_mon: hm.units,
        sch_units_tue: ht.units,
        sch_units_wed: hw.units,
        sch_units_thu: hth.units,
        sch_units_fri: hf.units,
        sch_units_sat: hsa.units,
      });
    }

    if (rowsToWrite.length === 0) {
      setSaveState("error");
      setSaveError("No rows with assignment_id were available to save.");
      return;
    }

    const { error } = await supabase.from("schedule").upsert(rowsToWrite, { onConflict: "schedule_id" });

    if (error) {
      setSaveState("error");
      setSaveError(error.message);
      return;
    }

    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1000);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Planning</div>
            <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
              On = {HOURS_PER_ON_DAY}h = {UNITS_PER_ON_DAY} units (units = hours * {UNITS_PER_HOUR}).
            </div>
            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              Week: <code className="text-xs">{props.weekStart}</code> → <code className="text-xs">{props.weekEnd}</code> •{" "}
              <span className="opacity-80">schedule_name:</span> <code className="text-xs">{props.scheduleName}</code>
            </div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              PC Org: <code className="text-xs">{props.pcOrgId}</code>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveError ? (
              <span className="text-xs text-amber-900 border border-amber-500/40 bg-amber-500/10 rounded-xl px-3 py-2">
                {saveError}
              </span>
            ) : null}

            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={save}
              className={[
                "rounded-xl px-3 py-2 text-sm",
                saveState === "saving"
                  ? "border border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)] cursor-not-allowed"
                  : "bg-[var(--to-ink)] text-[var(--to-surface)]",
              ].join(" ")}
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)]">
        <div className="border-b border-[var(--to-border)] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Weekly grid</div>
              <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                Persisted to <code className="text-xs">public.schedule</code> (assignment_id + week).
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MetricPill active={metric === "hours"} label="Hours" onClick={() => setMetric("hours")} />
              <MetricPill active={metric === "units"} label="Units" onClick={() => setMetric("units")} />
              <MetricPill active={metric === "techs"} label="Techs" onClick={() => setMetric("techs")} />
            </div>
          </div>

          {/* STEP 1.3: Quota placeholder card */}
          <div className="mt-4 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Quota (placeholder)</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Flat target: {QUOTA_TECHS_PER_DAY} Techs/day (derived to Hours/Units when metric changes).
                </div>
              </div>

              <div className="text-xs">
                <span className="text-[var(--to-ink-muted)]">Week variance:</span>{" "}
                <span className="font-semibold">{varianceWeek}</span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left">
                  <tr className="text-[var(--to-ink-muted)]">
                    <th className="py-2 pr-3">Type</th>
                    {DAYS.map((d) => (
                      <th key={d} className="py-2 px-2">
                        {DAY_LABEL[d]}
                      </th>
                    ))}
                    <th className="py-2 pl-3">Week</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 pr-3 font-semibold">Planned</td>
                    {DAYS.map((d) => (
                      <td key={d} className="py-2 px-2">
                        {plannedTotalsByDay[d]}
                      </td>
                    ))}
                    <td className="py-2 pl-3 font-semibold">{plannedWeekTotal}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold">Quota</td>
                    {DAYS.map((d) => (
                      <td key={d} className="py-2 px-2">
                        {quotaTotalsByDay[d]}
                      </td>
                    ))}
                    <td className="py-2 pl-3 font-semibold">{quotaWeekTotal}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold">Variance</td>
                    {DAYS.map((d) => (
                      <td key={d} className="py-2 px-2">
                        {varianceByDay[d]}
                      </td>
                    ))}
                    <td className="py-2 pl-3 font-semibold">{varianceWeek}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              Display metric: <span className="font-semibold">{metricLabel(metric)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-[var(--to-surface-soft)] text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Position</th>

                {DAYS.map((d) => (
                  <th key={d} className="px-4 py-3 font-semibold">
                    <div className="flex flex-col items-start leading-tight">
                      <div className="text-sm font-semibold">{plannedTotalsByDay[d]}</div>
                      <div className="text-[10px] uppercase text-[var(--to-ink-muted)]">{DAY_LABEL[d]}</div>
                    </div>
                  </th>
                ))}

                <th className="px-4 py-3 font-semibold">
                  <div className="flex flex-col items-start leading-tight">
                    <div className="text-sm font-semibold">{plannedWeekTotal}</div>
                    <div className="text-[10px] uppercase text-[var(--to-ink-muted)]">Week {metricLabel(metric)}</div>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {props.rows.map((r) => {
                const days = byMembership[r.person_pc_org_id];
                const hasAssignment = Boolean(r.assignment_id);

                const rowTotal =
                  !hasAssignment || !days ? 0 : DAYS.reduce((sum, d) => sum + metricValueForDay(Boolean(days[d]), metric), 0);

                return (
                  <tr key={r.person_pc_org_id} className="border-t border-[var(--to-border)]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name ?? "—"}</div>
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {r.membership_active ? "Active" : "Inactive"} • {r.membership_status ?? "—"}
                        {!hasAssignment ? " • No assignment (cannot schedule)" : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.person_role ?? "—"}</td>
                    <td className="px-4 py-3">{r.position_title ?? "—"}</td>

                    {DAYS.map((d) => (
                      <td key={d} className="px-4 py-3">
                        <TogglePill
                          on={Boolean(days?.[d])}
                          label={DAY_LABEL[d]}
                          disabled={!hasAssignment}
                          onClick={() => {
                            if (!hasAssignment) return;
                            setByMembership((prev) => {
                              const cur = prev[r.person_pc_org_id] ?? {
                                sun: true,
                                mon: true,
                                tue: true,
                                wed: true,
                                thu: true,
                                fri: true,
                                sat: true,
                              };
                              return {
                                ...prev,
                                [r.person_pc_org_id]: {
                                  ...cur,
                                  [d]: !cur[d],
                                },
                              };
                            });
                          }}
                        />
                      </td>
                    ))}

                    <td className="px-4 py-3 font-medium">{rowTotal}</td>
                  </tr>
                );
              })}

              {props.rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-[var(--to-ink-muted)]">
                    No membership rows found for this PC Org.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--to-border)] bg-[var(--to-surface-soft)] p-4 text-sm">
          <span className="font-semibold">Totals:</span> {plannedWeekTotal} {metricLabel(metric)}
        </div>
      </div>
    </div>
  );
}
