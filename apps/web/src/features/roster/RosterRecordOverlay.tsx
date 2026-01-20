"use client";

import { useMemo, useState } from "react";
import { Drawer } from "@/features/ui/Drawer";
import type { RosterRow } from "@/features/roster/RosterPageShell";

type TabKey = "person" | "org" | "assignments" | "leadership";
type TabStatus = "pending" | "ready" | "attention" | "locked";

function StatusPill({ status }: { status: TabStatus }) {
  const cfg: Record<TabStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "border-blue-500/40 bg-blue-500/10 text-blue-900" },
    ready: { label: "Ready", cls: "border-green-600/40 bg-green-600/10 text-green-900" },
    attention: { label: "Attention", cls: "border-amber-600/40 bg-amber-600/10 text-amber-900" },
    locked: { label: "Locked", cls: "border-[var(--to-border)] bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)]" },
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

export function RosterRecordOverlay(props: {
  open: boolean;
  onClose: () => void;
  row: RosterRow | null;
}) {
  const [tab, setTab] = useState<TabKey>("person");

    const tabState = useMemo(() => {
    const r = props.row;

    const person: TabStatus = r?.person_active === false ? "attention" : "ready";
    const org: TabStatus = r?.pc_org_id ? "ready" : "pending";

    // Assignments tab is only meaningful once Org Context is ready
    const assignments: TabStatus = org === "ready" ? (r?.assignment_id ? "ready" : "pending") : "locked";

    // Leadership depends on Assignments being ready
    const leadership: TabStatus = assignments === "ready" ? "pending" : "locked";

    return { person, org, assignments, leadership };
  }, [props.row]);

  // Disable tabs based on prerequisite readiness (direct gating, not string comparisons)
  const disabled: Record<TabKey, boolean> = {
    person: false,
    org: false, // org is available once a person exists; for roster rows it always does
    assignments: tabState.org !== "ready",
    leadership: tabState.assignments !== "ready",
  };


  const title = props.row?.full_name ? `Roster: ${props.row.full_name}` : "Roster Record";

  return (
    <Drawer
      open={props.open}
      onClose={props.onClose}
      title={title}
      description="Segmented record view (v2). Tabs follow the validation chain."
    >
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === "person"}
          label="Person"
          status={tabState.person}
          onClick={() => setTab("person")}
        />
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
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
        <div className="text-xs font-semibold">Eligibility</div>
        <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
          Scheduling/Operations becomes available when all tabs are Ready.
        </div>
      </div>

      {/* Tab content */}
      {tab === "person" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name" value={props.row?.full_name ?? ""} />
          <Field label="Role" value={props.row?.person_role ?? ""} />
          <Field label="Person active" value={String(props.row?.person_active ?? "")} />
          <Field label="Affiliation" value="(coming next: company/contractor association)" />
        </div>
      ) : null}

      {tab === "org" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="PC Org ID" value={props.row?.pc_org_id ?? ""} />
          <Field label="Membership status" value={props.row?.membership_status ?? ""} />
          <Field label="Membership active" value={String(props.row?.membership_active ?? "")} />
          <Field label="Division / Region / Office" value="(coming next: join org context view)" />
        </div>
      ) : null}

      {tab === "assignments" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Assignment ID" value={props.row?.assignment_id ?? ""} />
          <Field label="Position title" value={props.row?.position_title ?? ""} />
          <Field label="Assignment active" value={String(props.row?.assignment_active ?? "")} />
          <Field label="Start / End" value="(coming next: start/end fields wired into view)" />
        </div>
      ) : null}

      {tab === "leadership" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
            <div className="text-sm font-semibold">Leadership</div>
            <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
              Next: load reporting relationships (assignment_reporting) and allow edits when unlocked.
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
