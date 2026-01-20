//apps/web/src/app/(prod)/org/_shared/OrgRosterSegmentLeadership.tsx

"use client";

import type { MasterRosterRow } from "./OrgRosterPanel";
import { toBtnNeutral } from "../../_shared/toStyles";

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
    <span
      className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", toneClass)}
    >
      {children}
    </span>
  );
}

function InfoCard(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label}</div>
      <div className="font-medium text-[var(--to-ink)]">{props.value}</div>
    </div>
  );
}

export function OrgRosterSegmentLeadership(props: {
  row?: MasterRosterRow | null;
  isAdd: boolean;

  // TODO(grants): later replace with edge task grants
  canEditLeadership?: boolean;

  // future wiring: optional edit action (overlay will implement)
  onRequestEdit?: () => void;
}) {
  const { row, isAdd } = props;
  const canEditLeadership = props.canEditLeadership ?? false;

  const reportsTo = row?.reports_to_full_name || "—";
  const orgLabel = row?.pc_org_name || row?.pc_org_id || "—";
  const position = row?.position_title || "—";
  const active = row?.assignment_active ? "Yes" : "No";

  return (
    <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
      {/* Segment header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-[var(--to-ink)]">Leadership</div>
            {isAdd ? <Pill>After creation</Pill> : null}
            {!canEditLeadership ? <Pill>Read-only</Pill> : <Pill tone="ok">Editable</Pill>}
          </div>

          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            Reporting chain / leadership fields for roster context.
          </div>
        </div>

        {canEditLeadership && !isAdd ? (
          <button
            className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
            type="button"
            onClick={props.onRequestEdit}
          >
            Edit
          </button>
        ) : null}
      </div>

      {isAdd ? (
        <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
          Leadership is available after the assignment exists.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <InfoCard label="Reports To" value={reportsTo} />
          <InfoCard label="Org" value={orgLabel} />
          <InfoCard label="Position" value={position} />
          <InfoCard label="Active" value={active} />
        </div>
      )}

      {/* Optional: communicate “not wired” without throwing here */}
      {!isAdd && canEditLeadership && !props.onRequestEdit ? (
        <div className="mt-3 rounded-md border border-[var(--to-border)] bg-[var(--to-amber-100)] px-3 py-2 text-sm">
          <div className="font-medium text-[var(--to-ink)]">Editing unavailable</div>
          <div className="mt-1 text-[var(--to-ink-muted)]">
            Edit action handler is not wired yet.
          </div>
        </div>
      ) : null}
    </section>
  );
}
