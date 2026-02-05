"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RosterRow } from "@/lib/api";

export function OrgTab(props: {
  row: RosterRow | null;
  pcOrgName?: string | null;
  orgStartDate: string | null;

  endOrgBlocked: boolean;
  endOrgBlockedTitle: string;

  endPcOrgCascade: () => void;
}) {
  const { row, pcOrgName, orgStartDate, endOrgBlocked, endOrgBlockedTitle, endPcOrgCascade } = props;

  return (
    <div className="space-y-3">
      <Card title="Org">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold">{pcOrgName ?? "Org"}</div>
            {orgStartDate ? (
              <div className="text-xs text-[var(--to-ink-muted)]">Start date: {String(orgStartDate).slice(0, 10)}</div>
            ) : null}
            <div className="text-xs text-[var(--to-ink-muted)]">
              Actions here affect this person’s org association (soft close; no deletes).
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={endPcOrgCascade}
            disabled={endOrgBlocked}
            title={endOrgBlockedTitle}
          >
            End Org association
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-12 gap-2 text-sm">
          <div className="col-span-4 text-[var(--to-ink-muted)]">PC</div>
          <div className="col-span-8">
            {(row as any)?.pc_name ??
              (row as any)?.pc_number ??
              ((row as any)?.pc_id ? String((row as any)?.pc_id) : "—")}
          </div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">MSO</div>
          <div className="col-span-8">{(row as any)?.mso_name ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">Division</div>
          <div className="col-span-8">{(row as any)?.division_name ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">Region</div>
          <div className="col-span-8">{(row as any)?.region_name ?? "—"}</div>
        </div>

        <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
          “End Org association” sets <code className="px-1">end_date</code> to today on the{" "}
          <code className="px-1">person_pc_org</code> row for this person. No rows are deleted.
        </div>
      </Card>
    </div>
  );
}