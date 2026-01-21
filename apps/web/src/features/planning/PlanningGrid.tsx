"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS,
  DEFAULT_DAYS_ALL_ON,
  ScheduleMirrorProvider,
  type DayKey,
  type DaysMap,
  useScheduleMirror,
  useScheduleMirrorOptional,
} from "@/features/planning/scheduleMirror.store";

import { useRouter } from "next/navigation";

import { fetchRouteOptions, type DropdownOption } from "@/app/(prod)/_shared/dropdowns";

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

  // NEW (seeded in lead/planning/page.tsx)
  tech_id?: string | null;
};

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
  return 1;
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

type ScheduleSeed = {
  schedule_id: string;
  assignment_id: string;
  default_route_id?: string | null;
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

  // Ignored now on purpose (no drilldown from planning grid)
  onSelectRow?: (row: PlanningMemberRow) => void;
};

// keep placeholder quota (fine for now)
const QUOTA_TECHS_PER_DAY = 10;

function buildInitialByMembership(rows: PlanningMemberRow[], seeds: ScheduleSeed[]) {
  const byAssignmentDays: Record<string, DaysMap> = {};
  for (const s of seeds ?? []) {
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

  const seed: Record<string, DaysMap> = {};
  for (const r of rows) {
    const assignmentId = r.assignment_id ?? null;
    seed[r.person_pc_org_id] =
      assignmentId && byAssignmentDays[assignmentId] ? byAssignmentDays[assignmentId] : DEFAULT_DAYS_ALL_ON;
  }
  return seed;
}

function StatusPill(props: { state: "idle" | "saving" | "saved" | "error"; error?: string | null }) {
  if (props.state === "idle") return null;

  if (props.state === "saving") {
    return (
      <span className="rounded-full bg-[var(--to-surface-soft)] px-3 py-2 text-xs text-[var(--to-ink-muted)]">
        Saving…
      </span>
    );
  }

  if (props.state === "saved") {
    return <span className="rounded-full bg-green-600/10 px-3 py-2 text-xs text-green-900">Saved</span>;
  }

  return (
    <span className="rounded-full bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
      {props.error ?? "Save failed"}
    </span>
  );
}

export function PlanningGrid(props: Props) {
  const mirror = useScheduleMirrorOptional();
  const initialByMembership = useMemo(
    () => buildInitialByMembership(props.rows, props.scheduleSeeds),
    [props.rows, props.scheduleSeeds]
  );

  const initialScheduleIdByAssignment = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of props.scheduleSeeds ?? []) {
      if (!s.assignment_id) continue;
      map[s.assignment_id] = s.schedule_id;
    }
    return map;
  }, [props.scheduleSeeds]);

  if (!mirror) {
    return (
      <ScheduleMirrorProvider initialByMember={initialByMembership} initialScheduleIdByAssignment={initialScheduleIdByAssignment}>
        <PlanningGridInner {...props} />
      </ScheduleMirrorProvider>
    );
  }

  return <PlanningGridInner {...props} />;
}

function PlanningGridInner(props: Props) {
  const mirror = useScheduleMirror();
  const router = useRouter();

  const [metric, setMetric] = useState<Metric>("techs");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // ROUTES
  const [routeOptions, setRouteOptions] = useState<DropdownOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  // assignment_id -> route_id | null
  const [routeByAssignment, setRouteByAssignment] = useState<Record<string, string | null>>({});

  // per-assignment debounce timers
  const timersRef = useRef<Record<string, any>>({});
  // Seed route values from seeds
  useEffect(() => {
    const routes: Record<string, string | null> = {};
    for (const s of props.scheduleSeeds ?? []) {
      if (!s.assignment_id) continue;
      routes[s.assignment_id] = s.default_route_id ?? null;
    }
    setRouteByAssignment(routes);
  }, [props.scheduleSeeds]);

  // Load routes
  useEffect(() => {
    let cancelled = false;
    setRoutesLoading(true);
    setRoutesError(null);

    fetchRouteOptions()
      .then((opts) => {
        if (cancelled) return;

        // filter to pc org when meta.pc_org_id exists
        const filtered = (opts ?? []).filter((o) => {
          const pcOrgId = (o.meta as any)?.pc_org_id ?? null;
          if (!pcOrgId) return true;
          return String(pcOrgId) === String(props.pcOrgId);
        });

        setRouteOptions(filtered);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setRoutesError(err?.message ?? "Failed to load routes");
        setRouteOptions([]);
      })
      .finally(() => {
        if (cancelled) return;
        setRoutesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.pcOrgId]);

  const plannedTotalsByDay = useMemo(() => {
    const out: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    for (const r of props.rows) {
      if (!r.assignment_id) continue;
      const row = mirror.getDays(r.person_pc_org_id);
      for (const d of DAYS) out[d] += metricValueForDay(Boolean(row[d]), metric);
    }
    return out;
  }, [props.rows, mirror, metric]);

  const plannedWeekTotal = useMemo(() => {
    let sum = 0;
    for (const r of props.rows) {
      if (!r.assignment_id) continue;
      const row = mirror.getDays(r.person_pc_org_id);
      for (const d of DAYS) sum += metricValueForDay(Boolean(row[d]), metric);
    }
    return sum;
  }, [props.rows, mirror, metric]);

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

  const quotaWeekTotal = useMemo(() => DAYS.reduce((sum, d) => sum + quotaTotalsByDay[d], 0), [quotaTotalsByDay]);

  const varianceByDay = useMemo(() => {
    const out: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    for (const d of DAYS) out[d] = plannedTotalsByDay[d] - quotaTotalsByDay[d];
    return out;
  }, [plannedTotalsByDay, quotaTotalsByDay]);

  const varianceWeek = plannedWeekTotal - quotaWeekTotal;

  async function upsertOne(params: { assignmentId: string; personPcOrgId: string }) {
    setSaveState("saving");
    setSaveError(null);

    const { createClient } = await import("@/app/(prod)/_shared/supabase");
    const supabase = createClient();

    const assignmentId = params.assignmentId;
    const personPcOrgId = params.personPcOrgId;

    const days = mirror.getDays(personPcOrgId);
    const scheduleId = mirror.ensureScheduleId(assignmentId);

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

    const default_route_id = routeByAssignment[assignmentId] ?? null;

    const rowToWrite: any = {
      schedule_id: scheduleId,
      assignment_id: assignmentId,
      schedule_name: props.scheduleName,
      start_date: props.weekStart,
      end_date: props.weekEnd,
      default_route_id,

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
    };

    const { error } = await supabase.from("schedule").upsert([rowToWrite], { onConflict: "schedule_id" });

    if (error) {
      setSaveState("error");
      setSaveError(error.message);
      return;
    }

    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 800);
  }

  function queueAutosave(params: { assignmentId: string; personPcOrgId: string }) {
    const key = params.assignmentId;

    // clear existing timer
    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);

    timersRef.current[key] = setTimeout(() => {
      upsertOne(params).catch((err: any) => {
        setSaveState("error");
        setSaveError(err?.message ?? "Save failed");
      });
    }, 350);
  }

  function setAllDays(personPcOrgId: string, val: boolean) {
    const next: DaysMap = { sun: val, mon: val, tue: val, wed: val, thu: val, fri: val, sat: val };
    mirror.setDays(personPcOrgId, next);
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
              Week: <code className="text-xs">{props.weekStart}</code> → <code className="text-xs">{props.weekEnd}</code>{" "}
              • <span className="opacity-80">schedule_name:</span> <code className="text-xs">{props.scheduleName}</code>
            </div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              PC Org: <code className="text-xs">{props.pcOrgId}</code>
            </div>
            {routesError ? (
              <div className="mt-2 inline-block rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                Routes: {routesError}
              </div>
            ) : null}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-xs hover:bg-[var(--to-surface-soft)]"
            >
              Refresh
            </button>
            <StatusPill state={saveState} error={saveError} />
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
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-[var(--to-surface-soft)] text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Tech ID</th>

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

                {/* quick row actions */}
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>

            <tbody>
              {props.rows.map((r) => {
                const hasAssignment = Boolean(r.assignment_id);
                const assignmentId = r.assignment_id ?? null;

                const days = mirror.getDays(r.person_pc_org_id);

                const rowTotal =
                  !hasAssignment || !days ? 0 : DAYS.reduce((sum, d) => sum + metricValueForDay(Boolean(days[d]), metric), 0);

                const selectedRouteId = assignmentId ? routeByAssignment[assignmentId] ?? null : null;

                return (
                  <tr key={r.person_pc_org_id} className="border-t border-[var(--to-border)]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name ?? "—"}</div>

                      <div className="mt-2">
                        <select
                          className="w-full max-w-[340px] rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-xs"
                          disabled={!hasAssignment || routesLoading}
                          value={selectedRouteId ?? ""}
                          onChange={(e) => {
                            if (!assignmentId) return;
                            const v = e.target.value;
                            setRouteByAssignment((prev) => ({ ...prev, [assignmentId]: v ? v : null }));
                            queueAutosave({ assignmentId, personPcOrgId: r.person_pc_org_id });
                          }}
                        >
                          <option value="">{routesLoading ? "Loading routes…" : "— Unassigned route —"}</option>
                          {routeOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {!hasAssignment ? (
                          <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">No assignment (cannot set route)</div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs">{r.tech_id ?? "—"}</div>
                    </td>

                    {DAYS.map((d) => (
                      <td key={d} className="px-4 py-3">
                        <TogglePill
                          on={Boolean(days?.[d])}
                          label={DAY_LABEL[d]}
                          disabled={!hasAssignment}
                          onClick={() => {
                            if (!hasAssignment || !assignmentId) return;
                            mirror.toggleDay(r.person_pc_org_id, d);
                            queueAutosave({ assignmentId, personPcOrgId: r.person_pc_org_id });
                          }}
                        />
                      </td>
                    ))}

                    <td className="px-4 py-3 font-medium">{rowTotal}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={!hasAssignment || !assignmentId}
                          onClick={() => {
                            if (!hasAssignment || !assignmentId) return;
                            setAllDays(r.person_pc_org_id, false);
                            queueAutosave({ assignmentId, personPcOrgId: r.person_pc_org_id });
                          }}
                          className={[
                            "rounded-xl border px-3 py-2 text-xs",
                            "border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)] hover:bg-[var(--to-surface)]",
                            !hasAssignment ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          All Off
                        </button>

                        <button
                          type="button"
                          disabled={!hasAssignment || !assignmentId}
                          onClick={() => {
                            if (!hasAssignment || !assignmentId) return;
                            setAllDays(r.person_pc_org_id, true);
                            queueAutosave({ assignmentId, personPcOrgId: r.person_pc_org_id });
                          }}
                          className={[
                            "rounded-xl border px-3 py-2 text-xs",
                            "border-green-600/40 bg-green-600/10 text-green-900 hover:bg-green-600/15",
                            !hasAssignment ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          All On
                        </button>
                      </div>
                    </td>
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
          <span className="font-semibold">Weekly Roll-ups:</span> {plannedWeekTotal} {metricLabel(metric)}
        </div>
      </div>
    </div>
  );
}
