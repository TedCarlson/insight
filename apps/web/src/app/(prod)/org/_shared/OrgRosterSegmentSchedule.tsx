"use client";

import { useEffect, useMemo, useState } from "react";

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

          sch_hours_sun: Number(scheduleDraft.sch_hours_sun ?? 0),
          sch_hours_mon: Number(scheduleDraft.sch_hours_mon ?? 0),
          sch_hours_tue: Number(scheduleDraft.sch_hours_tue ?? 0),
          sch_hours_wed: Number(scheduleDraft.sch_hours_wed ?? 0),
          sch_hours_thu: Number(scheduleDraft.sch_hours_thu ?? 0),
          sch_hours_fri: Number(scheduleDraft.sch_hours_fri ?? 0),
          sch_hours_sat: Number(scheduleDraft.sch_hours_sat ?? 0),

          sch_units_sun: Number(scheduleDraft.sch_units_sun ?? 0),
          sch_units_mon: Number(scheduleDraft.sch_units_mon ?? 0),
          sch_units_tue: Number(scheduleDraft.sch_units_tue ?? 0),
          sch_units_wed: Number(scheduleDraft.sch_units_wed ?? 0),
          sch_units_thu: Number(scheduleDraft.sch_units_thu ?? 0),
          sch_units_fri: Number(scheduleDraft.sch_units_fri ?? 0),
          sch_units_sat: Number(scheduleDraft.sch_units_sat ?? 0),
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

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--to-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Schedule</div>
          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            Granular schedule entry/edit for this person (without Org Planning).
            {/* TODO(grants): gate schedule editing by edge task grants */}
          </div>
        </div>

        <button
          className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
          type="button"
          onClick={openCreateSchedule}
          disabled={isAdd || !assignmentId || schedulesLoading || schedulingLocked || busy || !canEditSchedule}
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

      {schedulingLocked ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Scheduling locked: add a Tech ID for this Technician to enable scheduling.
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
            <div className="overflow-auto rounded-md border" style={{ borderColor: "var(--to-border)" }}>
              <table className="min-w-full text-sm">
                <thead className="bg-black/5">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Start</th>
                    <th className="px-3 py-2 text-left font-medium">End</th>
                    <th className="px-3 py-2 text-left font-medium">Route</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id} className="border-t hover:bg-black/5">
                      <td className="px-3 py-2">{s.schedule_name}</td>
                      <td className="px-3 py-2">{s.start_date}</td>
                      <td className="px-3 py-2">{s.end_date || "—"}</td>
                      <td className="px-3 py-2">
                        {routes.find((r) => r.route_id === s.default_route_id)?.route_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="rounded-md border px-2 py-1 text-xs hover:bg-[var(--to-surface-2)]"
                          style={{ borderColor: "var(--to-border)" }}
                          type="button"
                          onClick={() => openEditSchedule(s)}
                          disabled={busy || !canEditSchedule}
                        >
                          Edit
                        </button>
                        <button
                          className="ml-2 rounded-md border px-2 py-1 text-xs hover:bg-[var(--to-surface-2)]"
                          style={{ borderColor: "var(--to-border)" }}
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

      {/* Modal */}
      {scheduleOpen && scheduleDraft ? (
        <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--to-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{scheduleDraft.schedule_id ? "Edit Schedule" : "Add Schedule"}</div>
              <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">Days, hours, units, default route.</div>
            </div>

            <button
              className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
              style={{ borderColor: "var(--to-border)" }}
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
              <div className="text-sm font-medium">Schedule Name</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                value={scheduleDraft.schedule_name ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), schedule_name: e.target.value }))}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">Default Route</div>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--to-border)" }}
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
              <div className="text-sm font-medium">Start Date</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                type="date"
                value={scheduleDraft.start_date ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), start_date: e.target.value }))}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">End Date</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                type="date"
                value={scheduleDraft.end_date ?? ""}
                onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), end_date: e.target.value || null }))}
                disabled={busy}
              />
            </label>
          </div>

          <div className="mt-3 rounded-md border p-3" style={{ borderColor: "var(--to-border)" }}>
            <div className="text-sm font-medium">Days</div>

            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {(
                [
                  ["sun", "Sun"],
                  ["mon", "Mon"],
                  ["tue", "Tue"],
                  ["wed", "Wed"],
                  ["thu", "Thu"],
                  ["fri", "Fri"],
                  ["sat", "Sat"],
                ] as const
              ).map(([key, label]) => {
                const hoursKey = `sch_hours_${key}` as const;
                const unitsKey = `sch_units_${key}` as const;

                return (
                  <div key={key} className="rounded-md border p-3" style={{ borderColor: "var(--to-border)" }}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!(scheduleDraft as any)[key]}
                        onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), [key]: e.target.checked } as any))}
                        disabled={busy}
                      />
                      <span className="font-medium">{label}</span>
                    </label>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <div className="text-xs text-[var(--to-ink-muted)]">Hours</div>
                        <input
                          className="rounded-md border px-2 py-1 text-sm"
                          style={{ borderColor: "var(--to-border)" }}
                          type="number"
                          value={String((scheduleDraft as any)[hoursKey] ?? 0)}
                          onChange={(e) =>
                            setScheduleDraft((d) => ({ ...(d || {}), [hoursKey]: Number(e.target.value) } as any))
                          }
                          disabled={busy}
                        />
                      </label>

                      <label className="grid gap-1">
                        <div className="text-xs text-[var(--to-ink-muted)]">Units</div>
                        <input
                          className="rounded-md border px-2 py-1 text-sm"
                          style={{ borderColor: "var(--to-border)" }}
                          type="number"
                          value={String((scheduleDraft as any)[unitsKey] ?? 0)}
                          onChange={(e) =>
                            setScheduleDraft((d) => ({ ...(d || {}), [unitsKey]: Number(e.target.value) } as any))
                          }
                          disabled={busy}
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
              className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
              style={{ borderColor: "var(--to-border)" }}
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
              className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white hover:opacity-90")}
              style={{ borderColor: "var(--to-border)" }}
              type="button"
              onClick={saveSchedule}
              disabled={busy}
            >
              {saving ? "Saving…" : "Save schedule"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
