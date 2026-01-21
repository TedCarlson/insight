//apps/web/src/features/planning/PlanningGrid.tsx

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

const HOURS_PER_ON_DAY = 8;
const UNITS_PER_HOUR = 12;

function computeHoursUnits(on: boolean) {
  const hours = on ? HOURS_PER_ON_DAY : 0;
  return { hours, units: hours * UNITS_PER_HOUR };
}

function TogglePill(props: { on: boolean; disabled?: boolean; onClick: () => void }) {
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
      {props.on ? "On" : "Off"}
    </button>
  );
}

function safeUuid() {
  // modern browsers support this; fallback is only for extreme cases
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // minimal fallback (not RFC perfect, but avoids hard failure)
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

  // Week window for the schedule rows we are editing
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  scheduleName: string;

  // Existing schedule rows for this window/name (if any)
  scheduleSeeds: ScheduleSeed[];
};

export function PlanningGrid(props: Props) {
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

      // default behavior (no existing schedule):
      // keep your original UX default (On for all days)
      const defaultDays: Record<DayKey, boolean> = {
        sun: true,
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
      };

      seed[r.person_pc_org_id] = assignmentId && byAssignmentDays[assignmentId] ? byAssignmentDays[assignmentId] : defaultDays;
    }

    return seed;
  }, [props.rows, props.scheduleSeeds]);

  const [byMembership, setByMembership] = useState<Record<string, Record<DayKey, boolean>>>(initialByMembership);

  const totals = useMemo(() => {
    let totalHours = 0;
    let totalUnits = 0;

    for (const r of props.rows) {
      const row = byMembership[r.person_pc_org_id];
      if (!row) continue;

      for (const d of DAYS) {
        const { hours, units } = computeHoursUnits(Boolean(row[d]));
        totalHours += hours;
        totalUnits += units;
      }
    }

    return { totalHours, totalUnits };
  }, [props.rows, byMembership]);

  async function save() {
    setSaveState("saving");
    setSaveError(null);

    // Lazy import to avoid bringing supabase client into server bundles accidentally
    const { createClient } = await import("@/app/(prod)/_shared/supabase");
    const supabase = createClient();

    // Build schedule rows keyed by assignment_id for this week + scheduleName
    const rowsToWrite: any[] = [];

    for (const r of props.rows) {
      const assignmentId = r.assignment_id ?? null;
      if (!assignmentId) continue; // no assignment => cannot write schedule

      const days = byMembership[r.person_pc_org_id];
      const scheduleId = scheduleIdByAssignment[assignmentId] ?? safeUuid();

      const sun = Boolean(days?.sun);
      const mon = Boolean(days?.mon);
      const tue = Boolean(days?.tue);
      const wed = Boolean(days?.wed);
      const thu = Boolean(days?.thu);
      const fri = Boolean(days?.fri);
      const sat = Boolean(days?.sat);

      const hs = computeHoursUnits(sun);
      const hm = computeHoursUnits(mon);
      const ht = computeHoursUnits(tue);
      const hw = computeHoursUnits(wed);
      const hth = computeHoursUnits(thu);
      const hf = computeHoursUnits(fri);
      const hsa = computeHoursUnits(sat);

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

    // Upsert on PK (schedule_id). For new schedules we generated a schedule_id.
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
              On = {HOURS_PER_ON_DAY}h = {HOURS_PER_ON_DAY * UNITS_PER_HOUR} units (units = hours * {UNITS_PER_HOUR}).
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
          <div className="text-sm font-semibold">Weekly grid</div>
          <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
            Persisted to <code className="text-xs">public.schedule</code> (assignment_id + week).
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
                  <th key={d} className="px-4 py-3 font-semibold uppercase text-xs">
                    {d}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Week Units</th>
              </tr>
            </thead>

            <tbody>
              {props.rows.map((r) => {
                const days = byMembership[r.person_pc_org_id];
                const hasAssignment = Boolean(r.assignment_id);

                const weekUnits = days ? DAYS.reduce((sum, d) => sum + computeHoursUnits(Boolean(days[d])).units, 0) : 0;

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

                    <td className="px-4 py-3 font-medium">{weekUnits}</td>
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
          <span className="font-semibold">Totals:</span> {totals.totalUnits} units • {totals.totalHours} hours
        </div>
      </div>
    </div>
  );
}
