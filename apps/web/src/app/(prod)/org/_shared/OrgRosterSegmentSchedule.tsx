//apps/web/src/app/%28prod%29/org/_shared/OrgRosterSegmentSchedule.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { toBtnNeutral, toRowHover, toTableWrap, toThead } from "../../_shared/toStyles";

type RouteRow = { route_id: string; route_name: string; pc_org_id: string };

type ScheduleRow = {
  schedule_id: string;
  assignment_id: string;
  schedule_name: string;
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

  sch_hours_sun: number;
  sch_hours_mon: number;
  sch_hours_tue: number;
  sch_hours_wed: number;
  sch_hours_thu: number;
  sch_hours_fri: number;
  sch_hours_sat: number;

  sch_units_sun: number;
  sch_units_mon: number;
  sch_units_tue: number;
  sch_units_wed: number;
  sch_units_thu: number;
  sch_units_fri: number;
  sch_units_sat: number;
};

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Pill(props: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" }) {
  const { children, tone = "neutral" } = props;

  const toneClass =
    tone === "warn"
      ? "border-[var(--to-border)] bg-[var(--to-amber-100)] text-[var(--to-ink)]"
      : tone === "ok"
      ? "border-[var(--to-border)] bg-[var(--to-green-100)] text-[var(--to-ink)]"
      : "border-[var(--to-border)] bg-[var(--to-surface-2)] text-[var(--to-ink)]";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", toneClass)}>
      {children}
    </span>
  );
}

async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const text = await res.text().catch(() => "");
    const preview = (text || "").slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `API returned non-JSON (${res.status} ${res.statusText}). ` +
        `This usually means a wrong route or redirect. Preview: ${preview || "—"}`
    );
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error((json && (json.error || json.message)) || `Request failed (${res.status})`);
  }
  return json;
}

const DAYS = [
  ["sun", "Sun"],
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
] as const;

type DayKey = (typeof DAYS)[number][0];

function hoursKeyFor(day: DayKey) {
  return `sch_hours_${day}` as const;
}
function unitsKeyFor(day: DayKey) {
  return `sch_units_${day}` as const;
}

function routeName(routes: RouteRow[], routeId: string | null) {
  if (!routeId) return "—";
  return routes.find((r) => r.route_id === routeId)?.route_name || "—";
}

export function OrgRosterSegmentSchedule(props: {
  isAdd: boolean;
  pcOrgId: string;
  assignmentId?: string | null;

  // for scheduling lock logic
  assignmentActive?: boolean | null;
  positionTitle?: string | null;
  techId?: string | null;

  // TODO(grants): replace with edge task grants
  canEditSchedule?: boolean;

  // surface errors to overlay
  onError: (msg: string | null) => void;
}) {
  const { isAdd, pcOrgId, assignmentId, assignmentActive, positionTitle, techId, onError } = props;
  const canEditSchedule = props.canEditSchedule ?? true;

  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<Partial<ScheduleRow> | null>(null);

  const [saving, setSaving] = useState(false);

  const schedulingLocked = useMemo(() => {
    const isActive = !!assignmentActive;
    const isTech = (positionTitle ?? "").trim().toLowerCase() === "technician";
    const missingTechId = !(techId && techId.trim() !== "");
    return isActive && isTech && missingTechId;
  }, [assignmentActive, positionTitle, techId]);

  useEffect(() => {
    if (!pcOrgId) return;
    (async () => {
      setRoutesLoading(true);
      onError(null);
      try {
        const params = new URLSearchParams();
        params.set("pc_org_id", pcOrgId);
        const json = await fetchJson<{ ok: boolean; routes: RouteRow[]; error?: string }>(
          `/api/org/routes?${params.toString()}`,
          { method: "GET" }
        );
        if (!json.ok) throw new Error(json.error || "Failed to load routes");
        setRoutes(json.routes || []);
      } catch (e: any) {
        setRoutes([]);
        onError(e?.message || "Failed to load routes");
      } finally {
        setRoutesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pcOrgId]);

  useEffect(() => {
    if (!assignmentId) {
      setSchedules([]);
      return;
    }
    (async () => {
      setSchedulesLoading(true);
      onError(null);
      try {
        const params = new URLSearchParams();
        params.set("assignment_id", assignmentId);
        const json = await fetchJson<{ ok: boolean; schedules: ScheduleRow[]; error?: string }>(
          `/api/org/assignment-schedule?${params.toString()}`,
          { method: "GET" }
        );
        if (!json.ok) throw new Error(json.error || "Failed to load schedules");
        setSchedules(json.schedules || []);
      } catch (e: any) {
        setSchedules([]);
        onError(e?.message || "Failed to load schedules");
      } finally {
        setSchedulesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  function openCreateSchedule() {
    if (!canEditSchedule) return;
    if (schedulingLocked) {
      onError("Scheduling locked: Technician assignments require a Tech ID before scheduling.");
      return;
    }
    if (!assignmentId) return;

    setScheduleDraft({
      assignment_id: assignmentId,
      schedule_name: "Default",
      start_date: isoToday(),
      end_date: null,
      default_route_id: null,

      sun: false,
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,

      sch_hours_sun: 0,
      sch_hours_mon: 8,
      sch_hours_tue: 8,
      sch_hours_wed: 8,
      sch_hours_thu: 8,
      sch_hours_fri: 8,
      sch_hours_sat: 0,

      sch_units_sun: 0,
      sch_units_mon: 0,
      sch_units_tue: 0,
      sch_units_wed: 0,
      sch_units_thu: 0,
      sch_units_fri: 0,
      sch_units_sat: 0,
    });
    setScheduleOpen(true);
  }

  function openEditSchedule(s: ScheduleRow) {
    if (!canEditSchedule) return;
    if (schedulingLocked) {
      onError("Scheduling locked: Technician assignments require a Tech ID before scheduling.");
      return;
    }
    setScheduleDraft({ ...s });
    setScheduleOpen(true);
  }

  async function refreshSchedules() {
    if (!assignmentId) return;
    setSchedulesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("assignment_id", assignmentId);
      const json = await fetchJson<{ ok: boolean; schedules: ScheduleRow[]; error?: string }>(
        `/api/org/assignment-schedule?${params.toString()}`,
        { method: "GET" }
      );
      if (!json.ok) throw new Error(json.error || "Failed to load schedules");
      setSchedules(json.schedules || []);
    } finally {
      setSchedulesLoading(false);
    }
  }

  async function saveSchedule() {
    if (!canEditSchedule) return;
    if (!scheduleDraft?.assignment_id) return;

    onError(null);
    setSaving(true);
    try {
      const json = await fetchJson<{ ok: boolean; error?: string }>("/api/org/assignment-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: scheduleDraft.schedule_id ?? null,
          assignment_id: scheduleDraft.assignment_id,
          schedule_name: scheduleDraft.schedule_name ?? "Schedule",
          start_date: scheduleDraft.start_date ?? isoToday(),
          end_date: scheduleDraft.end_date ?? null,
          default_route_id: scheduleDraft.default_route_id ?? null,

          sun: !!scheduleDraft.sun,
          mon: !!scheduleDraft.mon,
          tue: !!scheduleDraft.tue,
          wed: !!scheduleDraft.wed,
          thu: !!scheduleDraft.thu,
          fri: !!scheduleDraft.fri,
          sat: !!scheduleDraft.sat,

          sch_hours_sun: Number((scheduleDraft as any).sch_hours_sun ?? 0),
          sch_hours_mon: Number((scheduleDraft as any).sch_hours_mon ?? 0),
          sch_hours_tue: Number((scheduleDraft as any).sch_hours_tue ?? 0),
          sch_hours_wed: Number((scheduleDraft as any).sch_hours_wed ?? 0),
          sch_hours_thu: Number((scheduleDraft as any).sch_hours_thu ?? 0),
          sch_hours_fri: Number((scheduleDraft as any).sch_hours_fri ?? 0),
          sch_hours_sat: Number((scheduleDraft as any).sch_hours_sat ?? 0),

          sch_units_sun: Number((scheduleDraft as any).sch_units_sun ?? 0),
          sch_units_mon: Number((scheduleDraft as any).sch_units_mon ?? 0),
          sch_units_tue: Number((scheduleDraft as any).sch_units_tue ?? 0),
          sch_units_wed: Number((scheduleDraft as any).sch_units_wed ?? 0),
          sch_units_thu: Number((scheduleDraft as any).sch_units_thu ?? 0),
          sch_units_fri: Number((scheduleDraft as any).sch_units_fri ?? 0),
          sch_units_sat: Number((scheduleDraft as any).sch_units_sat ?? 0),
        }),
      });

      if (!json.ok) throw new Error(json.error || "Schedule save failed");

      setScheduleOpen(false);
      setScheduleDraft(null);
      await refreshSchedules();
    } catch (e: any) {
      onError(e?.message || "Schedule save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(scheduleId: string) {
    if (!canEditSchedule) return;
    if (!confirm("Delete this schedule?")) return;

    onError(null);
    setSaving(true);
    try {
      const params = new URLSearchParams();
      params.set("schedule_id", scheduleId);
      const json = await fetchJson<{ ok: boolean; error?: string }>(
        `/api/org/assignment-schedule?${params.toString()}`,
        { method: "DELETE" }
      );
      if (!json.ok) throw new Error(json.error || "Delete failed");
      await refreshSchedules();
    } catch (e: any) {
      onError(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving;

  const addDisabled =
    isAdd || !assignmentId || schedulesLoading || schedulingLocked || busy || !canEditSchedule;

  return (
    <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
      {/* Segment header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-[var(--to-ink)]">Schedule</div>
            {schedulesLoading ? <Pill>Loading…</Pill> : null}
            {!canEditSchedule ? <Pill>Read-only</Pill> : null}
            {schedulingLocked ? <Pill tone="warn">Locked</Pill> : null}
          </div>

          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            Granular schedule entry/edit for this person (without Org Planning).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
            type="button"
            onClick={openCreateSchedule}
            disabled={addDisabled}
            title={
              isAdd
                ? "Save assignment first, then edit schedule."
                : schedulingLocked
                ? "Scheduling locked until Tech ID is set for technicians."
                : undefined
            }
          >
            + Add schedule
          </button>
        </div>
      </div>

      {/* Lock + add mode messaging */}
      {schedulingLocked ? (
        <div className="mt-3 rounded-md border border-[var(--to-border)] bg-[var(--to-amber-100)] px-3 py-2 text-sm">
          <div className="font-medium text-[var(--to-ink)]">
            Scheduling locked
          </div>
          <div className="mt-1 text-[var(--to-ink-muted)]">
            Add a Tech ID for this Technician to enable scheduling.
          </div>
        </div>
      ) : null}

      {isAdd ? (
        <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
          Save the assignment first, then click the roster row to edit schedule.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {schedulesLoading ? (
            <div className="text-sm text-[var(--to-ink-muted)]">Loading schedules…</div>
          ) : schedules.length === 0 ? (
            <div className="text-sm text-[var(--to-ink-muted)]">No schedules yet.</div>
          ) : (
            <div className={toTableWrap}>
              <table className="min-w-full border-collapse text-sm">
                <thead className={cx("sticky top-0 border-b border-[var(--to-border)]", toThead)}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Start
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      End
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Route
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((s) => (
                    <tr
                      key={s.schedule_id}
                      className={cx("border-b border-[var(--to-border)]", toRowHover)}
                    >
                      <td className="px-3 py-2 text-[var(--to-ink)]">{s.schedule_name}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{s.start_date}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{s.end_date || "—"}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{routeName(routes, s.default_route_id)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className={cx(toBtnNeutral, "px-2 py-1 text-xs")}
                          type="button"
                          onClick={() => openEditSchedule(s)}
                          disabled={busy || !canEditSchedule}
                        >
                          Edit
                        </button>
                        <button
                          className={cx(toBtnNeutral, "ml-2 px-2 py-1 text-xs")}
                          type="button"
                          onClick={() => deleteSchedule(s.schedule_id)}
                          disabled={busy || !canEditSchedule}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      {scheduleOpen && scheduleDraft ? (
        <div className="mt-4 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-[var(--to-ink)]">
                  {scheduleDraft.schedule_id ? "Edit Schedule" : "Add Schedule"}
                </div>
                {saving ? <Pill tone="ok">Saving…</Pill> : <Pill>Draft</Pill>}
              </div>
              <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
                Days, hours, units, default route.
              </div>
            </div>

            <button
              className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
              type="button"
              onClick={() => {
                setScheduleOpen(false);
                setScheduleDraft(null);
              }}
              disabled={busy}
            >
              Close
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <div className="text-sm font-medium text-[var(--to-ink)]">Schedule Name</div>
              <input
                className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                value={scheduleDraft.schedule_name ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), schedule_name: e.target.value }))}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium text-[var(--to-ink)]">Default Route</div>
              <select
                className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                value={scheduleDraft.default_route_id ?? ""}
                onChange={(e) =>
                  setScheduleDraft((d) => ({ ...(d || {}), default_route_id: e.target.value || null }))
                }
                disabled={routesLoading || busy}
              >
                <option value="">—</option>
                {routes.map((r) => (
                  <option key={r.route_id} value={r.route_id}>
                    {r.route_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium text-[var(--to-ink)]">Start Date</div>
              <input
                className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                type="date"
                value={scheduleDraft.start_date ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), start_date: e.target.value }))}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium text-[var(--to-ink)]">End Date</div>
              <input
                className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                type="date"
                value={scheduleDraft.end_date ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), end_date: e.target.value || null }))}
                disabled={busy}
              />
            </label>
          </div>

          <div className="mt-3 rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="text-sm font-medium text-[var(--to-ink)]">Days</div>

            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {DAYS.map(([day, label]) => {
                const hk = hoursKeyFor(day);
                const uk = unitsKeyFor(day);

                const enabled = !!(scheduleDraft as any)[day];

                return (
                  <div key={day} className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] p-3">
                    <label className="flex items-center gap-2 text-sm text-[var(--to-ink)]">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          setScheduleDraft((d) => ({ ...(d || {}), [day]: e.target.checked } as any))
                        }
                        disabled={busy}
                      />
                      <span className="font-medium">{label}</span>
                    </label>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <div className="text-xs text-[var(--to-ink-muted)]">Hours</div>
                        <input
                          className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                          type="number"
                          value={String((scheduleDraft as any)[hk] ?? 0)}
                          onChange={(e) =>
                            setScheduleDraft((d) => ({ ...(d || {}), [hk]: Number(e.target.value) } as any))
                          }
                          disabled={busy || !enabled}
                        />
                      </label>

                      <label className="grid gap-1">
                        <div className="text-xs text-[var(--to-ink-muted)]">Units</div>
                        <input
                          className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                          type="number"
                          value={String((scheduleDraft as any)[uk] ?? 0)}
                          onChange={(e) =>
                            setScheduleDraft((d) => ({ ...(d || {}), [uk]: Number(e.target.value) } as any))
                          }
                          disabled={busy || !enabled}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
              type="button"
              onClick={() => {
                setScheduleOpen(false);
                setScheduleDraft(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              className={cx(
                "rounded-md border border-[var(--to-border)] px-3 py-2 text-sm",
                "bg-[var(--to-ink)] text-white hover:opacity-90"
              )}
              type="button"
              onClick={saveSchedule}
              disabled={busy}
            >
              Save schedule
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
