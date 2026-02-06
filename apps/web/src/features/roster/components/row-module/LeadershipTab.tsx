"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { RosterRow } from "@/shared/lib/api";
import { KVRow } from "../rosterRowModule.helpers";

export function LeadershipTab(props: {
  row: RosterRow | null;

  drillErr: string | null;
  leadershipErr: string | null;

  loadingDrill: boolean;
  drillForPersonLen: number;

  editingLeadership: boolean;
  savingLeadership: boolean;

  assignmentId: string | null;

  leadershipContext: {
    reports_to_full_name: string | null;
    reports_to_assignment_id: string | null;
  };

  leadershipDraftReportsToAssignmentId: string;

  managerOptions: Array<{ value: string; label: string }>;

  beginEditLeadership: () => void;
  cancelEditLeadership: () => void;
  saveLeadership: () => void;

  setLeadershipDraftReportsToAssignmentId: (v: string) => void;
}) {
  const {
    drillErr,
    leadershipErr,
    loadingDrill,
    drillForPersonLen,
    editingLeadership,
    savingLeadership,
    assignmentId,
    leadershipContext,
    leadershipDraftReportsToAssignmentId,
    managerOptions,
    beginEditLeadership,
    cancelEditLeadership,
    saveLeadership,
    setLeadershipDraftReportsToAssignmentId,
  } = props;

  return (
    <div className="space-y-3">
      {drillErr ? (
        <Notice variant="danger" title="Could not load roster drilldown">
          {drillErr}
        </Notice>
      ) : null}

      {leadershipErr ? (
        <Notice variant="danger" title="Could not save leadership">
          {leadershipErr}
        </Notice>
      ) : null}

      <Card title="Leadership">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-[var(--to-ink-muted)]">
              Reporting relationship is stored in <code className="px-1">Assignment</code>. Edit ends current and starts
              new.
            </div>
            {loadingDrill && !drillForPersonLen ? (
              <div className="text-sm text-[var(--to-ink-muted)]">Loading leadership…</div>
            ) : null}
          </div>

          {!editingLeadership ? (
            <Button onClick={beginEditLeadership} disabled={!assignmentId || loadingDrill}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={cancelEditLeadership} disabled={savingLeadership}>
                Cancel
              </Button>
              <Button onClick={saveLeadership} disabled={savingLeadership}>
                {savingLeadership ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {!editingLeadership ? (
            <>
              <KVRow label="Reports to" value={leadershipContext.reports_to_full_name ?? "—"} />
              <KVRow label="Manager assignment_id" value={leadershipContext.reports_to_assignment_id ?? "—"} />
            </>
          ) : (
            <div className="grid grid-cols-12 gap-2 text-sm">
              <div className="col-span-4 text-[var(--to-ink-muted)]">Reports to</div>
              <div className="col-span-8 space-y-2">
                <select
                  className="to-input"
                  value={leadershipDraftReportsToAssignmentId ?? ""}
                  onChange={(e) => setLeadershipDraftReportsToAssignmentId(e.target.value)}
                >
                  <option value="">— No manager (end current relationship) —</option>
                  {managerOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-[var(--to-ink-muted)]">
                  If you don’t see the right manager here, ensure they have an active assignment in this org.
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Keep scaffolding until handshake is verified */}
    </div>
  );
}