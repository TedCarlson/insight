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

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${c.cls}`}>
      {c.label}
    </span>
  );
}

function TabButton(props: {
  active: boolean;
  disabled?: boolean;
  label: string;
  status: TabStatus;
  onClick: () => void;
}) {
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
}) {
  const [tab, setTab] = useState<TabKey>("person");

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

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

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
          new Set(
            (rows ?? [])
              .map((r) => r.parent_assignment_id)
              .filter((id): id is string => Boolean(id))
          )
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

    // Person readiness requires Company/Contractor affiliation (co_ref_id)
    const personStatus: TabStatus =
      r.person_active === false ? "attention" : person?.co_ref_id ? "ready" : "pending";

    // Org Context readiness requires division/region/office (MSO) present
    const orgRequiredReady = Boolean(orgCtx?.division_id && orgCtx?.region_id && orgCtx?.mso_id);
    const orgStatus: TabStatus =
      personStatus !== "ready"
        ? "locked"
        : orgError
          ? "attention"
          : orgRequiredReady
            ? "ready"
            : "pending";

    // Assignments readiness: requires assignment_id; if load fails/missing -> attention
    const hasAssignment = Boolean(r.assignment_id);
    const assignmentStatus: TabStatus =
      orgStatus !== "ready"
        ? "locked"
        : !hasAssignment
          ? "pending"
          : assignmentError
            ? "attention"
            : "ready";

    // Leadership readiness: requires assignments ready; if load error -> attention; if active edge exists -> ready; else pending
    const leadershipStatus: TabStatus =
      assignmentStatus !== "ready"
        ? "locked"
        : leadershipError
          ? "attention"
          : currentLeaderEdge
            ? "ready"
            : "pending";

    // Schedule tab is a new segment: locked until the first four segments are all ready
    const coreReady =
      personStatus === "ready" &&
      orgStatus === "ready" &&
      assignmentStatus === "ready" &&
      leadershipStatus === "ready";

    // Once unlocked, Schedule is Ready (payload exists)
    const scheduleStatus: TabStatus = coreReady ? "ready" : "locked";

    return {
      person: personStatus,
      org: orgStatus,
      assignments: assignmentStatus,
      leadership: leadershipStatus,
      schedule: scheduleStatus,
    };
  }, [props.row, person, orgCtx, orgError, assignmentError, leadershipError, currentLeaderEdge]);

  // Disable tabs based on prerequisite readiness (unlock chain)
  const disabled: Record<TabKey, boolean> = {
    person: false,
    org: tabState.person !== "ready",
    assignments: tabState.org !== "ready",
    leadership: tabState.assignments !== "ready",
    schedule: tabState.leadership !== "ready",
  };

  // Eligibility derived from the first four tabs only
  const blockers = useMemo(() => {
    const b: string[] = [];
    if (tabState.person !== "ready") b.push("Person must be Ready (Affiliation required; Role derived).");
    if (tabState.org !== "ready") b.push("Org Context must be Ready (Division, Region, Office/MSO).");
    if (tabState.assignments !== "ready") b.push("Assignments must be Ready (active assignment + details).");
    if (tabState.leadership !== "ready") b.push("Leadership must be Ready (active leader link).");
    return b;
  }, [tabState]);

  const eligibleForScheduleOps = blockers.length === 0;

  const schedulePrepPayload = useMemo(() => {
    const r = props.row;
    if (!r) return null;

    const role = (person?.role ?? r.person_role ?? null) as string | null;

    return {
      version: "schedule_prep_v1",
      generated_at: new Date().toISOString(),
      canonical_identity: {
        person_pc_org_id: r.person_pc_org_id,
        person_id: r.person_id,
        pc_org_id: r.pc_org_id,
      },
      person: {
        full_name: r.full_name ?? null,
        role,
        active: r.person_active ?? null,
        affiliation: {
          co_ref_id: person?.co_ref_id ?? null,
          co_code: (person as any)?.co_code ?? null,
        },
      },
      org_context: orgCtx
        ? {
            pc_org_id: orgCtx.pc_org_id,
            pc_org_name: orgCtx.pc_org_name ?? null,
            pc_number: orgCtx.pc_number ?? null,
            division_id: orgCtx.division_id ?? null,
            division_name: orgCtx.division_name ?? null,
            region_id: orgCtx.region_id ?? null,
            region_name: orgCtx.region_name ?? null,
            mso_id: orgCtx.mso_id ?? null,
            mso_name: orgCtx.mso_name ?? null,
          }
        : null,
      assignment: r.assignment_id
        ? {
            assignment_id: r.assignment_id,
            position_title: r.position_title ?? null,
            assignment_active: r.assignment_active ?? null,
            tech_id: assignment?.tech_id ?? null,
            start_date: assignment?.start_date ?? null,
            end_date: assignment?.end_date ?? null,
            pc_org_name: assignment?.pc_org_name ?? null,
          }
        : null,
      leadership: {
        current_leader: currentLeaderEdge
          ? {
              assignment_reporting_id: currentLeaderEdge.assignment_reporting_id ?? null,
              parent_assignment_id: currentLeaderEdge.parent_assignment_id ?? null,
              leader_label: currentLeaderParent
                ? `${currentLeaderParent.full_name ?? "—"} • ${currentLeaderParent.position_title ?? "—"}`
                : currentLeaderEdge.parent_assignment_id ?? null,
              start_date: currentLeaderEdge.start_date ?? null,
              end_date: currentLeaderEdge.end_date ?? null,
              active: currentLeaderEdge.active ?? null,
            }
          : null,
        total_links: leadership.length,
      },
      planning_math: {
        units_per_hour: 12,
        on_shift_hours: 8,
        on_shift_units: 96,
      },
      eligibility: {
        eligible_for_schedule_ops: eligibleForScheduleOps,
        blockers,
      },
    };
  }, [
    props.row,
    person,
    orgCtx,
    assignment,
    currentLeaderEdge,
    currentLeaderParent,
    leadership.length,
    eligibleForScheduleOps,
    blockers,
  ]);

  const title = props.row?.full_name ? `Roster: ${props.row.full_name}` : "Roster Record";

  const selectedAffiliation =
    person?.co_ref_id ? companyOptions.find((o) => o.id === person.co_ref_id) : null;

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

      {/* Eligibility panel (core 4 tabs) */}
      <div className="mt-4 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold">Eligibility</div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              Scheduling/Operations is available when Person, Org Context, Assignments, and Leadership are all Ready.
            </div>
          </div>

          <span
            className={[
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
              eligibleForScheduleOps
                ? "border-green-600/40 bg-green-600/10 text-green-900"
                : "border-amber-600/40 bg-amber-600/10 text-amber-900",
            ].join(" ")}
          >
            {eligibleForScheduleOps ? "Eligible for Schedule/Ops" : "Not eligible"}
          </span>
        </div>

        {!eligibleForScheduleOps ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--to-ink-muted)]">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">All prerequisites are Ready.</div>
        )}
      </div>

      {/* Tab content */}
      {tab === "schedule" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Schedule Prep</div>
                <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                  Produces a single-person schedule output payload. Planning details remain in the Planning portal.
                </div>
              </div>

              <button
                type="button"
                disabled={!eligibleForScheduleOps || !schedulePrepPayload}
                onClick={async () => {
                  try {
                    setCopyState("idle");
                    const txt = JSON.stringify(schedulePrepPayload, null, 2);
                    await navigator.clipboard.writeText(txt);
                    setCopyState("copied");
                    setTimeout(() => setCopyState("idle"), 1200);
                  } catch {
                    setCopyState("error");
                    setTimeout(() => setCopyState("idle"), 1500);
                  }
                }}
                className={[
                  "rounded-xl px-3 py-2 text-sm",
                  eligibleForScheduleOps && schedulePrepPayload
                    ? "bg-[var(--to-ink)] text-[var(--to-surface)]"
                    : "border border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)] cursor-not-allowed",
                ].join(" ")}
              >
                {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy JSON"}
              </button>
            </div>

            {!eligibleForScheduleOps ? (
              <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
                This tab is locked until Person, Org Context, Assignments, and Leadership are all Ready.
              </div>
            ) : null}

            <div className="mt-3">
              <div className="text-xs font-semibold">Output payload (read-only)</div>
              <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3 text-xs">
                {schedulePrepPayload
                  ? JSON.stringify(schedulePrepPayload, null, 2)
                  : "{\n  \"status\": \"no row selected\"\n}"}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

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

                  // Auto-derive role based on selection type
                  const derivedRole =
                    selected?.source_type === "company"
                      ? "Hires"
                      : selected?.source_type === "contractor"
                        ? "Contractors"
                        : null;

                  // optimistic UI
                  setPerson((prev) =>
                    prev
                      ? {
                          ...prev,
                          co_ref_id: value ? value : null,
                          co_code: selected?.code ?? null,
                          role: derivedRole ?? prev.role,
                        }
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
            <Field label="Assignment active" value={String(props.row?.assignment_active ?? "")} />

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
                    const parentLabel = parent
                      ? `${parent.full_name ?? "—"} • ${parent.position_title ?? "—"}`
                      : e.parent_assignment_id ?? "—";

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
