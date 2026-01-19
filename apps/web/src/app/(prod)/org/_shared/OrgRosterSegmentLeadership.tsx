"use client";

import type { MasterRosterRow } from "./OrgRosterPanel";

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

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--to-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Leadership</div>
          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            Reporting chain / leadership fields for roster context.
            {/* TODO(grants): unlock edits based on role + edge task grants */}
          </div>
        </div>

        {canEditLeadership && !isAdd ? (
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
            style={{ borderColor: "var(--to-border)" }}
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
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Reports To</div>
            <div className="font-medium">{reportsTo}</div>
          </div>

          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Org</div>
            <div className="font-medium">{row?.pc_org_name || row?.pc_org_id || "—"}</div>
          </div>

          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Position</div>
            <div className="font-medium">{row?.position_title || "—"}</div>
          </div>

          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Active</div>
            <div className="font-medium">{row?.assignment_active ? "Yes" : "No"}</div>
          </div>
        </div>
      )}
    </section>
  );
}
