"use client";

import { useEffect, useMemo, useState } from "react";
import AdminOverlay from "../../_shared/AdminOverlay";
import type { MasterRosterRow } from "./OrgRosterPanel";

type Mode = "add" | "edit";

type UnassignedPerson = {
  person_id: string;
  full_name: string;
  emails?: string | null;
};

type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

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

export function OrgRosterOverlay(props: {
  open: boolean;
  mode: Mode;
  pcOrgId: string;
  row?: MasterRosterRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isAdd = props.mode === "add";

  // ---------- shared state ----------
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------- person selection (add) ----------
  const [q, setQ] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [people, setPeople] = useState<UnassignedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");

  // ---------- assignment core ----------
  const [techId, setTechId] = useState<string>("");
  const [positionTitle, setPositionTitle] = useState<string>("Rep");
  const [startDate, setStartDate] = useState<string>(isoToday());
  const [endDate, setEndDate] = useState<string>("");

  // titles
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [titles, setTitles] = useState<PositionTitleRow[]>([]);

  // ---------- schedule ----------
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<Partial<ScheduleRow> | null>(null);

  // Initialize fields on open
  useEffect(() => {
    if (!props.open) return;

    setError(null);
    setSaving(false);

    // Load titles
    (async () => {
      setTitlesLoading(true);
      try {
        const res = await fetch("/api/meta/position-titles", { method: "GET" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load position titles");
        setTitles(json.titles || []);
      } catch (e: any) {
        setTitles([]);
        setError(e?.message || "Failed to load position titles");
      } finally {
        setTitlesLoading(false);
      }
    })();

    if (isAdd) {
      setQ("");
      setPeople([]);
      setSelectedPersonId("");
      setTechId("");
      setPositionTitle("Rep");
      setStartDate(isoToday());
      setEndDate("");
      setSchedules([]);
      setScheduleOpen(false);
      setScheduleDraft(null);
      return;
    }

    // Edit init from row
    const r = props.row;
    setSelectedPersonId(r?.person_id || "");
    setTechId(r?.tech_id || "");
    setPositionTitle(r?.position_title || "Rep");
    setStartDate((r?.start_date as any) || "");
    setEndDate((r?.end_date as any) || "");

    // Load routes + schedules (edit only)
    if (r?.pc_org_id) {
      loadRoutes(r.pc_org_id);
    }
    if (r?.assignment_id) {
      loadSchedules(r.assignment_id);
    }
  }, [props.open, isAdd, props.row]);

  async function loadPeople(search: string) {
    setLoadingPeople(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("q", search);
      const res = await fetch(`/api/org/unassigned?${params.toString()}`, { method: "GET" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load people");
      setPeople(json.people || []);
    } catch (e: any) {
      setPeople([]);
      setError(e?.message || "Failed to load people");
    } finally {
      setLoadingPeople(false);
    }
  }

  async function loadRoutes(pcOrgId: string) {
    setRoutesLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("pc_org_id", pcOrgId);
      const res = await fetch(`/api/org/routes?${params.toString()}`, { method: "GET" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load routes");
      setRoutes(json.routes || []);
    } catch (e: any) {
      setRoutes([]);
      setError(e?.message || "Failed to load routes");
    } finally {
      setRoutesLoading(false);
    }
  }

  async function loadSchedules(assignmentId: string) {
    setSchedulesLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("assignment_id", assignmentId);
      const res = await fetch(`/api/org/assignment-schedule?${params.toString()}`, { method: "GET" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load schedules");
      setSchedules(json.schedules || []);
    } catch (e: any) {
      setSchedules([]);
      setError(e?.message || "Failed to load schedules");
    } finally {
      setSchedulesLoading(false);
    }
  }

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return (people || []).find((p) => p.person_id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (isAdd) {
        if (!selectedPersonId) throw new Error("Select a person");
        if (!positionTitle) throw new Error("Select a position title");
        if (!startDate) throw new Error("Start date is required");

        const res = await fetch("/api/org/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pc_org_id: props.pcOrgId,
            person_id: selectedPersonId,
            position_title: positionTitle,
            start_date: startDate,
            tech_id: techId || null,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Assign failed");

        props.onSaved();
        props.onClose();
        return;
      }

      // edit
      const assignment_id = props.row?.assignment_id;
      if (!assignment_id) throw new Error("Missing assignment_id");
      if (!positionTitle) throw new Error("Select a position title");

      const normalizedEndDate = endDate?.trim() ? endDate.trim() : null;
      const active = normalizedEndDate ? false : true;

      const res = await fetch("/api/org/assignment/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id,
          tech_id: techId || null,
          position_title: positionTitle || null,
          start_date: startDate || null,
          end_date: normalizedEndDate,
          active,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");

      props.onSaved();
      // keep open, but refresh schedules in case assignment changed
      if (assignment_id) await loadSchedules(assignment_id);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ----- schedule editor helpers -----
  function openCreateSchedule() {
    if (!props.row?.assignment_id) return;
    setScheduleDraft({
      assignment_id: props.row.assignment_id,
      schedule_name: "Default",
      start_date: isoToday(),
      end_date: null,
      default_route_id: null,
      sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false,
      sch_hours_sun: 0, sch_hours_mon: 8, sch_hours_tue: 8, sch_hours_wed: 8, sch_hours_thu: 8, sch_hours_fri: 8, sch_hours_sat: 0,
      sch_units_sun: 0, sch_units_mon: 0, sch_units_tue: 0, sch_units_wed: 0, sch_units_thu: 0, sch_units_fri: 0, sch_units_sat: 0,
    });
    setScheduleOpen(true);
  }

  function openEditSchedule(s: ScheduleRow) {
    setScheduleDraft({ ...s });
    setScheduleOpen(true);
  }

  async function saveSchedule() {
    if (!scheduleDraft?.assignment_id) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org/assignment-schedule", {
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

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Schedule save failed");

      setScheduleOpen(false);
      setScheduleDraft(null);
      if (props.row?.assignment_id) await loadSchedules(props.row.assignment_id);
    } catch (e: any) {
      setError(e?.message || "Schedule save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(scheduleId: string) {
    if (!confirm("Delete this schedule?")) return;
    setError(null);
    setSaving(true);
    try {
      const params = new URLSearchParams();
      params.set("schedule_id", scheduleId);
      const res = await fetch(`/api/org/assignment-schedule?${params.toString()}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      if (props.row?.assignment_id) await loadSchedules(props.row.assignment_id);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (!props.open) return null;

  const title = isAdd ? "Add to Roster" : "Edit Roster Entry";
  const subtitle = isAdd
    ? "Select a person and create an assignment in this org."
    : "Edit assignment details and person schedule.";

  const pcOrgName = props.row?.pc_org_name;

  return (
    <AdminOverlay
      open={props.open}
      onClose={props.onClose}
      title={title}
      subtitle={subtitle}
      mode={isAdd ? "create" : "edit"}
      widthClassName="w-full max-w-4xl"
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {/* Person */}
        <section className="rounded-xl border p-4">
          <div className="text-sm font-semibold">Person</div>

          {isAdd ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Search unassigned people…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  className="rounded-md border px-3 py-2 text-sm"
                  type="button"
                  onClick={() => loadPeople(q)}
                  disabled={loadingPeople}
                >
                  {loadingPeople ? "Searching…" : "Search"}
                </button>
              </div>

              <div className="rounded-md border">
                {people.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-[var(--to-ink-muted)]">
                    {loadingPeople ? "Loading…" : "No results."}
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-auto divide-y">
                    {people.map((p) => (
                      <li key={p.person_id} className="px-3 py-2">
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            type="radio"
                            name="person"
                            className="mt-1"
                            checked={selectedPersonId === p.person_id}
                            onChange={() => setSelectedPersonId(p.person_id)}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{p.full_name}</div>
                            {p.emails ? (
                              <div className="truncate text-xs text-[var(--to-ink-muted)]">{p.emails}</div>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedPerson ? (
                <div className="text-sm text-[var(--to-ink-muted)]">Selected: {selectedPerson.full_name}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
                <div className="text-xs text-[var(--to-ink-muted)]">Name</div>
                <div className="font-medium">{props.row?.full_name}</div>
              </div>
              <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
                <div className="text-xs text-[var(--to-ink-muted)]">Mobile</div>
                <div className="font-medium">{props.row?.mobile || "—"}</div>
              </div>
              <div className="rounded-md bg-black/5 px-3 py-2 text-sm md:col-span-2">
                <div className="text-xs text-[var(--to-ink-muted)]">Company / Contractor</div>
                <div className="font-medium">{props.row?.co_name || "—"}</div>
              </div>
            </div>
          )}
        </section>

        {/* Assignment */}
        <section className="rounded-xl border p-4">
          <div className="text-sm font-semibold">Assignment</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <div className="text-sm font-medium">PC Org</div>
              <div className="rounded-md border bg-black/5 px-3 py-2 text-sm">
                {pcOrgName ? `${pcOrgName}` : props.pcOrgId}
              </div>
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">Reports To</div>
              <div className="rounded-md border bg-black/5 px-3 py-2 text-sm">
                {props.row?.reports_to_full_name || "—"}
              </div>
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">Position Title</div>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                disabled={titlesLoading || titles.length === 0}
              >
                {titlesLoading ? (
                  <option value={positionTitle}>Loading…</option>
                ) : titles.length === 0 ? (
                  <option value={positionTitle}>No titles available</option>
                ) : (
                  titles.map((t) => (
                    <option key={t.position_title} value={t.position_title}>
                      {t.position_title}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">Tech ID</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="Human-entered tech identifier"
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">Start Date</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                type="date"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="grid gap-1">
              <div className="text-sm font-medium">End Date</div>
              <input
                className="rounded-md border px-3 py-2 text-sm"
                type="date"
                value={endDate || ""}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isAdd}
              />
              {isAdd ? (
                <div className="text-xs text-[var(--to-ink-muted)]">End date can be set after creation.</div>
              ) : null}
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-md border px-3 py-2 text-sm" type="button" onClick={props.onClose}>
              Cancel
            </button>
            <button
              className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white")}
              type="button"
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {/* Schedule (edit only) */}
        <section className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Schedule</div>
              <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
                Granular schedule entry/edit for this person (without Org Planning).
              </div>
            </div>

            <button
              className="rounded-md border px-3 py-2 text-sm"
              type="button"
              onClick={openCreateSchedule}
              disabled={isAdd || schedulesLoading}
              title={isAdd ? "Save assignment first, then edit schedule." : undefined}
            >
              + Add schedule
            </button>
          </div>

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
                <div className="overflow-auto rounded-md border">
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
                        <tr key={s.schedule_id} className="border-t">
                          <td className="px-3 py-2">{s.schedule_name}</td>
                          <td className="px-3 py-2">{s.start_date}</td>
                          <td className="px-3 py-2">{s.end_date || "—"}</td>
                          <td className="px-3 py-2">
                            {routes.find((r) => r.route_id === s.default_route_id)?.route_name || "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              className="rounded-md border px-2 py-1 text-xs"
                              type="button"
                              onClick={() => openEditSchedule(s)}
                            >
                              Edit
                            </button>
                            <button
                              className="ml-2 rounded-md border px-2 py-1 text-xs"
                              type="button"
                              onClick={() => deleteSchedule(s.schedule_id)}
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
        </section>

        {/* Schedule modal */}
        {scheduleOpen && scheduleDraft ? (
          <AdminOverlay
            open={scheduleOpen}
            onClose={() => {
              setScheduleOpen(false);
              setScheduleDraft(null);
            }}
            title={scheduleDraft.schedule_id ? "Edit Schedule" : "Add Schedule"}
            subtitle="Edit days, hours, units, and default route."
            mode={scheduleDraft.schedule_id ? "edit" : "create"}
            widthClassName="w-full max-w-3xl"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <div className="text-sm font-medium">Schedule Name</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    value={scheduleDraft.schedule_name ?? ""}
                    onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), schedule_name: e.target.value }))}
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-sm font-medium">Default Route</div>
                  <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={scheduleDraft.default_route_id ?? ""}
                    onChange={(e) =>
                      setScheduleDraft((d) => ({ ...(d || {}), default_route_id: e.target.value || null }))
                    }
                    disabled={routesLoading}
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
                    type="date"
                    value={scheduleDraft.start_date ?? ""}
                    onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), start_date: e.target.value }))}
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-sm font-medium">End Date</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    type="date"
                    value={scheduleDraft.end_date ?? ""}
                    onChange={(e) => setScheduleDraft((d) => ({ ...(d || {}), end_date: e.target.value || null }))}
                  />
                </label>
              </div>

              <div className="rounded-md border p-3">
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
                      <div key={key} className="rounded-md border p-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!(scheduleDraft as any)[key]}
                            onChange={(e) =>
                              setScheduleDraft((d) => ({ ...(d || {}), [key]: e.target.checked } as any))
                            }
                          />
                          <span className="font-medium">{label}</span>
                        </label>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="grid gap-1">
                            <div className="text-xs text-[var(--to-ink-muted)]">Hours</div>
                            <input
                              className="rounded-md border px-2 py-1 text-sm"
                              type="number"
                              value={String((scheduleDraft as any)[hoursKey] ?? 0)}
                              onChange={(e) =>
                                setScheduleDraft((d) => ({ ...(d || {}), [hoursKey]: Number(e.target.value) } as any))
                              }
                            />
                          </label>
                          <label className="grid gap-1">
                            <div className="text-xs text-[var(--to-ink-muted)]">Units</div>
                            <input
                              className="rounded-md border px-2 py-1 text-sm"
                              type="number"
                              value={String((scheduleDraft as any)[unitsKey] ?? 0)}
                              onChange={(e) =>
                                setScheduleDraft((d) => ({ ...(d || {}), [unitsKey]: Number(e.target.value) } as any))
                              }
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  className="rounded-md border px-3 py-2 text-sm"
                  type="button"
                  onClick={() => {
                    setScheduleOpen(false);
                    setScheduleDraft(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white")}
                  type="button"
                  onClick={saveSchedule}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </div>
          </AdminOverlay>
        ) : null}
      </div>
    </AdminOverlay>
  );
}
