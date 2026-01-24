// apps/web/src/components/roster/RosterTable.tsx
"use client";

import type { CSSProperties } from "react";
import type { RosterRow } from "@/lib/api";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";

const rosterGridStyle: CSSProperties = {
  // Short/id columns use fixed-ish widths; the three text-heavy columns share remaining space evenly.
  gridTemplateColumns: "6rem minmax(12rem,1fr) 10rem 8rem 5rem minmax(0,1fr) minmax(0,1fr)",
};

export function RosterTable({
  roster,
  onRowOpen,
  pickName,
}: {
  roster: RosterRow[];
  onRowOpen: (row: RosterRow) => void;
  pickName: (row: RosterRow) => string;
}) {
  return (
    <DataTable
      zebra
      hover
      // Template-driven, distributed columns that still respect content and truncate long text.
      layout="content"
      // IMPORTANT: no min-w-max here; it prevents fr columns from distributing and disables truncation.
      gridClassName="w-full overflow-hidden"
      gridStyle={rosterGridStyle}
    >
      <DataTableHeader>
        <div className="whitespace-nowrap">Tech ID</div>
        <div className="min-w-0">Name</div>
        <div className="whitespace-nowrap">Mobile</div>
        <div className="whitespace-nowrap">NT Login</div>
        <div className="whitespace-nowrap">CSG</div>
        <div className="min-w-0">Reports To</div>
        <div className="min-w-0">Affiliation</div>
      </DataTableHeader>

      <DataTableBody zebra>
        {roster.map((r, idx) => (
          <DataTableRow
            key={(r as any).assignment_id ?? (r as any).person_id ?? idx}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onRowOpen(r)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onRowOpen(r);
            }}
          >
            <div className="whitespace-nowrap font-mono text-xs">{(r as any)?.tech_id ?? "—"}</div>

            <div className="min-w-0 truncate">{(r as any)?.full_name ?? pickName(r)}</div>

            <div className="whitespace-nowrap font-mono text-xs text-[var(--to-ink-muted)]">{(r as any)?.mobile ?? "—"}</div>

            <div className="whitespace-nowrap truncate font-mono text-xs text-[var(--to-ink-muted)]">
              {(r as any)?.person_nt_login ?? "—"}
            </div>

            <div className="whitespace-nowrap truncate font-mono text-xs text-[var(--to-ink-muted)]">
              {(r as any)?.person_csg_id ?? "—"}
            </div>

            <div className="min-w-0 truncate text-xs text-[var(--to-ink-muted)]">
              {(r as any)?.reports_to_full_name ?? "—"}
            </div>

            <div className="min-w-0 truncate text-xs text-[var(--to-ink-muted)]">{(r as any)?.co_name ?? "—"}</div>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
