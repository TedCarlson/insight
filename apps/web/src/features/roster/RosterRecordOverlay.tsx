"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/features/ui/Drawer";
import type { RosterRow } from "@/features/roster/RosterPageShell";

import { createClient } from "@/app/(prod)/_shared/supabase";
import { fetchCompanyOptions, type CompanyOption } from "@/app/(prod)/_shared/dropdowns";
import { fetchPersonById, updatePersonEmployer } from "@/app/(prod)/person/person.api";
import type { PersonRow } from "@/app/(prod)/person/person.types";

import { fetchAssignmentsByIds } from "@/app/(prod)/assignment/assignment.api";
import type { AssignmentRow } from "@/app/(prod)/assignment/assignment.types";

import {
  DAYS as MIRROR_DAYS,
  DEFAULT_DAYS_ALL_ON,
  type DayKey,
  useScheduleMirrorOptional,
} from "@/features/planning/scheduleMirror.store";

type TabKey = "person" | "org" | "assignments" | "leadership" | "schedule";
type TabStatus = "pending" | "ready" | "attention" | "locked";

type PcOrgAdminRow = {
  pc_org_id: string;
  pc_org_name: string | null;

  pc_id: string | null;
  pc_number: string | null;

  division_id: string | null;
  division_name: string | null;

  region_id: string | null;
  region_name: string | null;

  mso_id: string | null;
  mso_name: string | null;
};

/** public.assignment_leadership_admin_v (leadership view over assignment_reporting) */
type LeadershipRow = {
  assignment_reporting_id: string | null;
  child_assignment_id: string | null;
  parent_assignment_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  active: boolean | null;
};

const DAYS_UI: Array<{ key: DayKey; label: string; short: string }> = [
  { key: "sun", label: "Sunday", short: "Sun" },
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
];

function countOnDays(days: Record<DayKey, boolean>) {
  return MIRROR_DAYS.reduce((acc, d) => acc + (days[d] ? 1 : 0), 0);
}

function safeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const supabase = createClient();

function StatusPill({ status }: { status: TabStatus }) {
  const cfg: Record<TabStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "border-blue-500/40 bg-blue-500/10 text-blue-900" },
    ready: { label: "Ready", cls: "border-green-600/40 bg-green-600/10 text-green-900" },
    attention: { label: "Attention", cls: "border-amber-600/40 bg-amber-600/10 text-amber-900" },
    locked: {
      label: "Locked",
      cls: "border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)]",
    },
  };

  const c = cfg[status];

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${c.cls}`}>{c.label}</span>;
}

function TabButton(props: { active: boolean; disabled?: boolean; label: string; status: TabStatus; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        props.active
          ? "border-[var(--to-border)] bg-[var(--to-surface-soft)]"
          : "border-[var(--to-border)] bg-[var(--to-surface)] hover:bg-[var(--to-surface-soft)]",
        props.disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <span className="font-medium">{props.label}</span>
      <StatusPill status={props.status} />
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
      <div className="text-xs text-[var(--to-ink-muted)]">{label}</div>
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}

async function fetchPcOrgAdminById(pcOrgId: string): Promise<PcOrgAdminRow> {
  const { data, error } = await supabase
    .from("pc_org_admin_v")
    .select(
      [
        "pc_org_id",
        "pc_org_name",
        "pc_id",
        "pc_number",
        "division_id",
        "division_name",
        "region_id",
        "region_name",
        "mso_id",
        "mso_name",
      ].join(",")
    )
    .eq("pc_org_id", pcOrgId)
    .single();

  if (error) {
    console.error("fetchPcOrgAdminById error", error);
    throw error;
  }

  return data as PcOrgAdminRow;
}

async function fetchLeadershipForChildAssignment(assignmentId: string): Promise<LeadershipRow[]> {
  const { data, error } = await supabase
    .from("assignment_leadership_admin_v")
    .select("*")
    .eq("child_assignment_id", assignmentId)
    .order("active", { ascending: false, nullsFirst: false })
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("fetchLeadershipForChildAssignment error", error);
    throw error;
  }

  return (data ?? []) as LeadershipRow[];
}

export function RosterRecordOverlay(props: {
  open: boolean;
  onClose: () => void;
  row: RosterRow | null;

  /** required for persisting schedule */
  scheduleScope?: { weekStart: string; weekEnd: string; scheduleName: string };
}) {
  const [tab, setTab] = useState<TabKey>("person");

  const mirror = useScheduleMirrorOptional();

  const [person, setPerson] = useState<PersonRow | null>(null);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  const [orgCtx, setOrgCtx] = useState<PcOrgAdminRow | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipError, setLeadershipError] = useState<string | null>(null);
  const [leaderParentsById, setLeaderParentsById] = useState<Record<string, AssignmentRow>>({});

  const [scheduleSaveState, setScheduleSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scheduleSaveError, setScheduleSaveError] = useState<string | null>(null);

  const [scheduleHydrateState, setScheduleHydrateState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [scheduleHydrateError, setScheduleHydrateError] = useState<string | null>(null);

  // Lint rule requires we avoid synchronous setState inside effect bodies.
  const defer = (fn: () => void) => {
    Promise.resolve().then(fn);
  };

  // Reset tab when opening a new row to avoid landing on locked tabs
  useEffect(() => {
    if (!props.open) return;
    defer(() => setTab("person"));
  }, [props.open, props.row?.person_pc_org_id]);

  // Load person + company/contractor options when overlay opens
  useEffect(() => {
    const personId = props.row?.person_id;

    if (!props.open || !personId) {
      defer(() => {
        setPerson(null);
        setCompanyOptions([]);
        setPersonError(null);
        setPersonLoading(false);
      });
      return;
    }

    let cancelled = false;

    defer(() => {
      setPersonLoading(true);
      setPersonError(null);
    });

    Promise.all([fetchPersonById(personId), fetchCompanyOptions()])
      .then(([p, opts]) => {
        if (cancelled) return;
        setPerson(p);
        setCompanyOptions(opts);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("RosterRecordOverlay person load failed", err);
        setPersonError(err?.message ?? "Failed to load person");
      })
      .finally(() => {
        if (cancelled) return;
        setPersonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.open, props.row?.person_id]);

  // Load Org Context (pc_org_admin_v) when overlay opens
  useEffect(() => {
    const pcOrgId = props.row?.pc_org_id;

    if (!props.open || !pcOrgId) {
      defer(() => {
        setOrgCtx(null);
        setOrgError(null);
        setOrgLoading(false);
      });
      return;
    }

    let cancelled = false;

    defer(() => {
      setOrgLoading(true);
      setOrgError(null);
    });

    fetchPcOrgAdminById(pcOrgId)
      .then((o) => {
        if (cancelled) return;
        setOrgCtx(o);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("RosterRecordOverlay org context load failed", err);
        setOrgError(err?.message ?? "Failed to load org context");
      })
      .finally(() => {
        if (cancelled) return;
        setOrgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.open, props.row?.pc_org_id]);

  // Load Assignment details (assignment_admin_v) when overlay opens
  useEffect(() => {
    const assignmentId = props.row?.assignment_id;

    if (!props.open || !assignmentId) {
      defer(() => {
        setAssignment(null);
        setAssignmentError(null);
        setAssignmentLoading(false);
      });
      return;
    }

    let cancelled = false;

    defer(() => {
      setAssignmentLoading(true);
      setAssignmentError(null);
    });

    fetchAssignmentsByIds([assignmentId])
      .then((rows) => {
        if (cancelled) return;
        const found = rows?.[0] ?? null;
        setAssignment(found);
        if (!found) {
          setAssignmentError("Assignment not found in assignment_admin_v");
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("RosterRecordOverlay assignment load failed", err);
        setAssignmentError(err?.message ?? "Failed to load assignment");
      })
      .finally(() => {
        if (cancelled) return;
        setAssignmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.open, props.row?.assignment_id]);

  // Load Leadership links (assignment_leadership_admin_v) when overlay opens
  useEffect(() => {
    const childAssignmentId = props.row?.assignment_id;

    if (!props.open || !childAssignmentId) {
      defer(() => {
        setLeadership([]);
        setLeaderParentsById({});
        setLeadershipError(null);
        setLeadershipLoading(false);
      });
      return;
    }

    // If assignment details failed, keep leadership quiet; tab status will lock/attention accordingly
    if (assignmentError) {
      defer(() => {
        setLeadership([]);
        setLeaderParentsById({});
        setLeadershipError(null);
        setLeadershipLoading(false);
      });
      return;
    }

    let cancelled = false;

    defer(() => {
      setLeadershipLoading(true);
      setLeadershipError(null);
    });

    fetchLeadershipForChildAssignment(childAssignmentId)
      .then(async (rows) => {
        if (cancelled) return;
        setLeadership(rows);

        const parentIds = Array.from(
          new Set((rows ?? []).map((r) => r.parent_assignment_id).filter((id): id is string => Boolean(id)))
        );

        if (parentIds.length === 0) {
          setLeaderParentsById({});
          return;
        }

        try {
          const parents = await fetchAssignmentsByIds(parentIds);
          if (cancelled) return;

          const map: Record<string, AssignmentRow> = {};
          for (const p of parents ?? []) {
            if (p?.assignment_id) map[p.assignment_id] = p;
          }
          setLeaderParentsById(map);
        } catch (err: any) {
          if (cancelled) return;
          console.error("RosterRecordOverlay leadership parent fetch failed", err);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("RosterRecordOverlay leadership load failed", err);
        setLeadershipError(err?.message ?? "Failed to load leadership links");
      })
      .finally(() => {
        if (cancelled) return;
        setLeadershipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.open, props.row?.assignment_id, assignmentError]);

  const currentLeaderEdge = useMemo(() => {
    const active = leadership.find((e) => e.active === true && !e.end_date);
    return active ?? null;
  }, [leadership]);

  const currentLeaderParent = useMemo(() => {
    const pid = currentLeaderEdge?.parent_assignment_id ?? null;
    if (!pid) return null;
    return leaderParentsById[pid] ?? null;
  }, [currentLeaderEdge, leaderParentsById]);

  const tabState = useMemo(() => {
    const r = props.row;

    if (!r) {
      return {
        person: "pending" as TabStatus,
        org: "locked" as TabStatus,
        assignments: "locked" as TabStatus,
        leadership: "locked" as TabStatus,
        schedule: "locked" as TabStatus,
      };
    }

    const personStatus: TabStatus = r.person_active === false ? "attention" : person?.co_ref_id ? "ready" : "pending";

    const orgRequiredReady = Boolean(orgCtx?.division_id && orgCtx?.region_id && orgCtx?.mso_id);
    const orgStatus: TabStatus =
      personStatus !== "ready" ? "locked" : orgError ? "attention" : orgRequiredReady ? "ready" : "pending";

    const hasAssignment = Boolean(r.assignment_id);
    const assignmentStatus: TabStatus =
      orgStatus !== "ready" ? "locked" : !hasAssignment ? "pending" : assignmentError ? "attention" : "ready";

    const leadershipStatus: TabStatus =
      assignmentStatus !== "ready" ? "locked" : leadershipError ? "attention" : currentLeaderEdge ? "ready" : "pending";

    const coreReady =
      personStatus === "ready" && orgStatus === "ready" && assignmentStatus === "ready" && leadershipStatus === "ready";

    const scheduleStatus: TabStatus = !coreReady ? "locked" : "ready";

    return {
      person: personStatus,
      org: orgStatus,
      assignments: assignmentStatus,
      leadership: leadershipStatus,
      schedule: scheduleStatus,
    };
  }, [props.row, person, orgCtx, orgError, assignmentError, leadershipError, currentLeaderEdge]);

  const disabled: Record<TabKey, boolean> = {
    person: false,
    org: tabState.person !== "ready",
    assignments: tabState.org !== "ready",
    leadership: tabState.assignments !== "ready",
    schedule: tabState.leadership !== "ready",
  };

  const eligibleForScheduleOps = tabState.schedule === "ready";

  const title = props.row?.full_name ? `Roster: ${props.row.full_name}` : "Roster Record";

  const selectedAffiliation = person?.co_ref_id ? companyOptions.find((o) => o.id === person.co_ref_id) : null;

  async function hydrateScheduleFromDb() {
    try {
      setScheduleHydrateState("loading");
      setScheduleHydrateError(null);

      if (!props.open) return;
      if (tab !== "schedule") return;
      if (!props.row) throw new Error("No person selected.");
      if (!props.row.assignment_id) throw new Error("No assignment_id (cannot hydrate schedule).");
      if (!props.scheduleScope) throw new Error("Missing schedule scope.");
      if (!mirror) throw new Error("Mirror not available.");

      const { data, error } = await supabase
        .from("schedule")
        .select("schedule_id, default_route_id, sun, mon, tue, wed, thu, fri, sat")
        .eq("assignment_id", props.row.assignment_id)
        .eq("schedule_name", props.scheduleScope.scheduleName)
        .eq("start_date", props.scheduleScope.weekStart)
        .eq("end_date", props.scheduleScope.weekEnd)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // If we found a saved row, make mirror reflect DB (read-first)
      if (data?.schedule_id) {
        mirror.setScheduleId(props.row.assignment_id, data.schedule_id);

        mirror.setDays(props.row.person_pc_org_id, {
          sun: Boolean(data.sun),
          mon: Boolean(data.mon),
          tue: Boolean(data.tue),
          wed: Boolean(data.wed),
          thu: Boolean(data.thu),
          fri: Boolean(data.fri),
          sat: Boolean(data.sat),
        });
      }

      setScheduleHydrateState("ready");
    } catch (err: any) {
      setScheduleHydrateState("error");
      setScheduleHydrateError(err?.message ?? "Failed to load schedule");
    }
  }

  // ✅ Top-level hook: auto-hydrate when Schedule tab becomes active
  useEffect(() => {
    if (!props.open) return;
    if (tab !== "schedule") return;
    hydrateScheduleFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.open,
    tab,
    props.row?.assignment_id,
    props.row?.person_pc_org_id,
    props.scheduleScope?.weekStart,
    props.scheduleScope?.weekEnd,
    props.scheduleScope?.scheduleName,
  ]);

  async function saveSchedule() {
    try {
      setScheduleSaveState("saving");
      setScheduleSaveError(null);

      if (!eligibleForScheduleOps) throw new Error("Schedule is locked.");
      if (!props.row) throw new Error("No person selected.");
      if (!mirror) throw new Error("Mirror not available.");
      if (!props.scheduleScope) throw new Error("Missing schedule scope.");
      if (!props.row.assignment_id) throw new Error("No assignment_id (cannot schedule).");

      const assignmentId = props.row.assignment_id;
      const scope = props.scheduleScope;

      const scheduleId = mirror ? mirror.ensureScheduleId(assignmentId) : safeUuid();

      const days = mirror.getDays(props.row.person_pc_org_id);

      const sun = Boolean(days.sun);
      const mon = Boolean(days.mon);
      const tue = Boolean(days.tue);
      const wed = Boolean(days.wed);
      const thu = Boolean(days.thu);
      const fri = Boolean(days.fri);
      const sat = Boolean(days.sat);

      const HOURS_PER_ON_DAY = 8;
      const UNITS_PER_HOUR = 12;
      const UNITS_PER_ON_DAY = HOURS_PER_ON_DAY * UNITS_PER_HOUR;

      const rowToWrite = {
        schedule_id: scheduleId,
        assignment_id: assignmentId,
        schedule_name: scope.scheduleName,
        start_date: scope.weekStart,
        end_date: scope.weekEnd,
        default_route_id: null,

        sun,
        mon,
        tue,
        wed,
        thu,
        fri,
        sat,

        sch_hours_sun: sun ? HOURS_PER_ON_DAY : 0,
        sch_hours_mon: mon ? HOURS_PER_ON_DAY : 0,
        sch_hours_tue: tue ? HOURS_PER_ON_DAY : 0,
        sch_hours_wed: wed ? HOURS_PER_ON_DAY : 0,
        sch_hours_thu: thu ? HOURS_PER_ON_DAY : 0,
        sch_hours_fri: fri ? HOURS_PER_ON_DAY : 0,
        sch_hours_sat: sat ? HOURS_PER_ON_DAY : 0,

        sch_units_sun: sun ? UNITS_PER_ON_DAY : 0,
        sch_units_mon: mon ? UNITS_PER_ON_DAY : 0,
        sch_units_tue: tue ? UNITS_PER_ON_DAY : 0,
        sch_units_wed: wed ? UNITS_PER_ON_DAY : 0,
        sch_units_thu: thu ? UNITS_PER_ON_DAY : 0,
        sch_units_fri: fri ? UNITS_PER_ON_DAY : 0,
        sch_units_sat: sat ? UNITS_PER_ON_DAY : 0,
      };

      const { error } = await supabase.from("schedule").upsert([rowToWrite], { onConflict: "schedule_id" });
      if (error) throw new Error(error.message);

      setScheduleSaveState("saved");
      setTimeout(() => setScheduleSaveState("idle"), 1000);
    } catch (e: any) {
      setScheduleSaveState("error");
      setScheduleSaveError(e?.message ?? "Save failed");
    }
  }

  return (
    <Drawer
      open={props.open}
      onClose={props.onClose}
      title={title}
      description="Segmented record view (v2). Tabs follow the validation chain."
    >
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "person"} label="Person" status={tabState.person} onClick={() => setTab("person")} />
        <TabButton
          active={tab === "org"}
          label="Org Context"
          status={tabState.org}
          disabled={disabled.org}
          onClick={() => setTab("org")}
        />
        <TabButton
          active={tab === "assignments"}
          label="Assignments"
          status={tabState.assignments}
          disabled={disabled.assignments}
          onClick={() => setTab("assignments")}
        />
        <TabButton
          active={tab === "leadership"}
          label="Leadership"
          status={tabState.leadership}
          disabled={disabled.leadership}
          onClick={() => setTab("leadership")}
        />
        <TabButton
          active={tab === "schedule"}
          label="Schedule"
          status={tabState.schedule}
          disabled={disabled.schedule}
          onClick={() => setTab("schedule")}
        />
      </div>

      {/* Schedule tab */}
      {tab === "schedule" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Schedule</div>
                <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                  Flat weekday on/off. Uses the same state mirror as Planning.
                </div>
                {props.scheduleScope ? (
                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                    Week: <code className="text-xs">{props.scheduleScope.weekStart}</code> →{" "}
                    <code className="text-xs">{props.scheduleScope.weekEnd}</code> •{" "}
                    <span className="opacity-80">schedule_name:</span>{" "}
                    <code className="text-xs">{props.scheduleScope.scheduleName}</code>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">Week scope not provided.</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* ✅ Hydrate status */}
                {scheduleHydrateState === "loading" ? (
                  <span className="rounded-full bg-[var(--to-surface-soft)] px-3 py-2 text-xs text-[var(--to-ink-muted)]">
                    Loading…
                  </span>
                ) : scheduleHydrateState === "error" ? (
                  <span className="rounded-full bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                    {scheduleHydrateError ?? "Load failed"}
                  </span>
                ) : null}

                {/* ✅ Manual hydrate */}
                <button
                  type="button"
                  onClick={hydrateScheduleFromDb}
                  disabled={!mirror || !props.row?.assignment_id || !props.scheduleScope || scheduleHydrateState === "loading"}
                  className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-xs hover:bg-[var(--to-surface-soft)] disabled:opacity-60"
                >
                  Reload
                </button>

                {scheduleSaveError ? (
                  <span className="text-xs text-amber-900 border border-amber-500/40 bg-amber-500/10 rounded-xl px-3 py-2">
                    {scheduleSaveError}
                  </span>
                ) : null}

                <button
                  type="button"
                  disabled={
                    !eligibleForScheduleOps ||
                    !mirror ||
                    !props.row?.assignment_id ||
                    !props.scheduleScope ||
                    scheduleSaveState === "saving"
                  }
                  onClick={saveSchedule}
                  className={[
                    "rounded-xl px-3 py-2 text-sm",
                    !eligibleForScheduleOps ||
                    !mirror ||
                    !props.row?.assignment_id ||
                    !props.scheduleScope ||
                    scheduleSaveState === "saving"
                      ? "border border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)] cursor-not-allowed"
                      : "bg-[var(--to-ink)] text-[var(--to-surface)]",
                  ].join(" ")}
                >
                  {scheduleSaveState === "saving" ? "Saving…" : scheduleSaveState === "saved" ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {!eligibleForScheduleOps ? (
              <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
                This tab is locked until Person, Org Context, Assignments, and Leadership are all Ready.
              </div>
            ) : null}

            {!mirror && eligibleForScheduleOps ? (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="font-semibold">Mirror unavailable</div>
                <div className="mt-1 opacity-90">Schedule mirror provider is missing above this overlay.</div>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[950px] rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">Route</span>
                    <select
                      className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-xs"
                      disabled
                      value=""
                      onChange={() => {}}
                    >
                      <option value="">— Select —</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {DAYS_UI.map((d) => {
                      const canToggle = eligibleForScheduleOps && Boolean(mirror) && Boolean(props.row?.person_pc_org_id);
                      const days =
                        props.row?.person_pc_org_id && mirror ? mirror.getDays(props.row.person_pc_org_id) : DEFAULT_DAYS_ALL_ON;
                      const planned = Boolean(days[d.key]);

                      return (
                        <button
                          key={d.key}
                          type="button"
                          disabled={!canToggle}
                          onClick={() => {
                            if (!canToggle || !props.row || !mirror) return;
                            mirror.toggleDay(props.row.person_pc_org_id, d.key);
                          }}
                          className={[
                            "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs",
                            planned
                              ? "border-green-600/40 bg-green-600/10 text-green-900"
                              : "border-[var(--to-border)] bg-[var(--to-surface)] text-[var(--to-ink-muted)]",
                            !canToggle ? "opacity-60 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          {planned ? d.short : "Off"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
                    {(() => {
                      const days =
                        props.row?.person_pc_org_id && mirror ? mirror.getDays(props.row.person_pc_org_id) : DEFAULT_DAYS_ALL_ON;
                      const onDays = countOnDays(days);
                      const units = onDays * 96;

                      return (
                        <>
                          <span className="text-[var(--to-ink-muted)]">
                            Days: <span className="font-semibold text-[var(--to-ink)]">{onDays}</span>
                          </span>
                          <span className="text-[var(--to-ink-muted)]">
                            Hours: <span className="font-semibold text-[var(--to-ink)]">{onDays * 8}</span>
                          </span>
                          <span className="text-[var(--to-ink-muted)]">
                            Units: <span className="font-semibold text-[var(--to-ink)]">{units}</span>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
                  Toggle rule matches Planning: <span className="font-semibold">On → weekday label</span>,{" "}
                  <span className="font-semibold">Off → “Off”</span>.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Person tab */}
      {tab === "person" ? (
        <div className="mt-4 space-y-3">
          {personError ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="font-semibold">Person load warning</div>
              <div className="mt-1 opacity-90">{personError}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name" value={props.row?.full_name ?? ""} />
            <Field label="Role" value={(person?.role ?? props.row?.person_role ?? "") as string} />
            <Field label="Person active" value={String(props.row?.person_active ?? "")} />

            <div className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
              <div className="text-xs text-[var(--to-ink-muted)]">Affiliation (Company / Contractor)</div>

              <select
                className="mt-2 w-full rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
                value={person?.co_ref_id ?? ""}
                disabled={personLoading || !person}
                onChange={async (e) => {
                  if (!props.row) return;

                  const value = e.target.value;
                  const selected = companyOptions.find((o) => o.id === value) ?? null;

                  const derivedRole =
                    selected?.source_type === "company" ? "Hires" : selected?.source_type === "contractor" ? "Contractors" : null;

                  setPerson((prev) =>
                    prev
                      ? { ...prev, co_ref_id: value ? value : null, co_code: selected?.code ?? null, role: derivedRole ?? prev.role }
                      : prev
                  );

                  setPersonError(null);

                  try {
                    const updated = await updatePersonEmployer(props.row.person_id, {
                      co_ref_id: value ? value : null,
                      co_code: selected?.code ?? null,
                      role: derivedRole,
                    });
                    setPerson(updated);
                  } catch (err: any) {
                    console.error("Affiliation update failed", err);
                    setPersonError(err?.message ?? "Affiliation update failed");

                    try {
                      const refreshed = await fetchPersonById(props.row.person_id);
                      setPerson(refreshed);
                    } catch {}
                  }
                }}
              >
                <option value="">— Unassigned —</option>
                {companyOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
                {personLoading
                  ? "Loading person…"
                  : selectedAffiliation
                    ? `Selected: ${selectedAffiliation.label}`
                    : "Required to unlock Org Context."}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Org tab */}
      {tab === "org" ? (
        <div className="mt-4 space-y-3">
          {orgError ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="font-semibold">Org Context load warning</div>
              <div className="mt-1 opacity-90">{orgError}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="PC Org ID" value={props.row?.pc_org_id ?? ""} />
            <Field label="PC Org name" value={orgCtx?.pc_org_name ?? ""} />
            <Field label="PC number" value={orgCtx?.pc_number ?? ""} />

            <Field label="Membership status" value={props.row?.membership_status ?? ""} />
            <Field label="Membership active" value={String(props.row?.membership_active ?? "")} />

            <Field label="Division" value={orgCtx?.division_name ?? ""} />
            <Field label="Region" value={orgCtx?.region_name ?? ""} />
            <Field label="Office (MSO)" value={orgCtx?.mso_name ?? ""} />
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            {orgLoading
              ? "Loading org context…"
              : tabState.org === "ready"
                ? "Org Context is Ready."
                : "Org Context requires Division, Region, and Office (MSO)."}
          </div>
        </div>
      ) : null}

      {/* Assignments tab */}
      {tab === "assignments" ? (
        <div className="mt-4 space-y-3">
          {assignmentError ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="font-semibold">Assignment load warning</div>
              <div className="mt-1 opacity-90">{assignmentError}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Assignment ID" value={props.row?.assignment_id ?? ""} />
            <Field label="Position title" value={props.row?.position_title ?? ""} />
            <Field label="Assignment active" value={String((props.row as any)?.assignment_active ?? "")} />

            <Field label="Tech ID" value={assignment?.tech_id ?? ""} />
            <Field label="Start date" value={assignment?.start_date ?? ""} />
            <Field label="End date" value={assignment?.end_date ?? ""} />
            <Field label="PC Org name (from assignment)" value={assignment?.pc_org_name ?? ""} />
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            {assignmentLoading
              ? "Loading assignment details…"
              : props.row?.assignment_id
                ? tabState.assignments === "ready"
                  ? "Assignment details loaded."
                  : "Assignment exists, but details need attention."
                : "No active assignment found yet for this membership."}
          </div>
        </div>
      ) : null}

      {/* Leadership tab */}
      {tab === "leadership" ? (
        <div className="mt-4 space-y-3">
          {leadershipError ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="font-semibold">Leadership load warning</div>
              <div className="mt-1 opacity-90">{leadershipError}</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
            <div className="text-sm font-semibold">Current leader</div>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Status" value={leadershipLoading ? "Loading…" : currentLeaderEdge ? "Assigned" : "Unassigned"} />
              <Field
                label="Leader (parent assignment)"
                value={
                  currentLeaderParent
                    ? `${currentLeaderParent.full_name ?? "—"} • ${currentLeaderParent.position_title ?? "—"}`
                    : currentLeaderEdge?.parent_assignment_id ?? ""
                }
              />
              <Field label="Leader start" value={currentLeaderEdge?.start_date ?? ""} />
              <Field label="Leader end" value={currentLeaderEdge?.end_date ?? ""} />
            </div>

            <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
              {leadershipLoading
                ? "Loading leadership links…"
                : currentLeaderEdge
                  ? "Leadership is Ready."
                  : "Leadership is Pending (assign a leader to complete eligibility)."}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)]">
            <div className="border-b border-[var(--to-border)] p-4">
              <div className="text-sm font-semibold">Reporting history</div>
              <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                Links are sourced from <code className="text-xs">assignment_reporting</code> via{" "}
                <code className="text-xs">assignment_leadership_admin_v</code>.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--to-surface-soft)] text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Active</th>
                    <th className="px-4 py-3 font-semibold">Parent</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">End</th>
                  </tr>
                </thead>
                <tbody>
                  {leadership.map((e) => {
                    const parent = e.parent_assignment_id ? leaderParentsById[e.parent_assignment_id] : null;
                    const parentLabel = parent ? `${parent.full_name ?? "—"} • ${parent.position_title ?? "—"}` : e.parent_assignment_id ?? "—";

                    return (
                      <tr key={e.assignment_reporting_id ?? `${e.parent_assignment_id}-${e.start_date}-${e.created_at}`}>
                        <td className="px-4 py-3 border-t border-[var(--to-border)]">{e.active ? "true" : "false"}</td>
                        <td className="px-4 py-3 border-t border-[var(--to-border)]">{parentLabel}</td>
                        <td className="px-4 py-3 border-t border-[var(--to-border)]">{e.start_date ?? "—"}</td>
                        <td className="px-4 py-3 border-t border-[var(--to-border)]">{e.end_date ?? "—"}</td>
                      </tr>
                    );
                  })}

                  {!leadershipLoading && leadership.length === 0 && !leadershipError ? (
                    <tr>
                      <td className="px-4 py-8 text-[var(--to-ink-muted)]" colSpan={4}>
                        No reporting links found for this assignment yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
