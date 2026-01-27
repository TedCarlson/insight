"use client";

import type { CSSProperties } from "react";
import type { RosterRow } from "@/lib/api";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";

const rosterGridStyle: CSSProperties = {
  // Short/id columns use fixed-ish widths; the three text-heavy columns share remaining space evenly.
  gridTemplateColumns: "6rem minmax(12rem,1fr) 10rem 8rem 5rem minmax(0,1fr) minmax(0,1fr) 8rem",
};

// Company vs Contractor classification:
// Company is ONLY ITG (Integrated Tech Group). Everything else is treated as contractor.
const ITG_COMPANY_NAMES = new Set(["itg", "integrated tech group"]);

function normalizeAffiliationName(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function isITGCompanyAffiliation(v: unknown) {
  return ITG_COMPANY_NAMES.has(normalizeAffiliationName(v));
}

function MiniStatusPill({
  label,
  ok,
  title,
}: {
  label: string;
  ok: boolean;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none"
      style={
        ok
          ? {
              background: "rgba(34, 197, 94, 0.14)",
              borderColor: "var(--to-status-success)",
              color: "var(--to-status-success)",
            }
          : {
              background: "rgba(249, 115, 22, 0.16)",
              borderColor: "var(--to-status-warning)",
              color: "var(--to-status-warning)",
            }
      }
      title={title}
      aria-label={title}
    >
      {label}
    </span>
  );
}

function getStatusFlags(r: any) {
  const assignmentEnd = String(r?.assignment_end_date ?? r?.end_date ?? "").trim();
  const assignmentActive = Boolean(r?.assignment_active ?? r?.active ?? true);
  const hasAssignment = !!String(r?.assignment_id ?? "").trim() && assignmentActive && !assignmentEnd;

  const leadershipEnd = String(r?.reports_to_end_date ?? r?.leadership_end_date ?? "").trim();
  const leadershipId =
    r?.reports_to_reporting_id ?? r?.assignment_reporting_id ?? r?.reporting_id ?? r?.id ?? null;
  const hasLeadership = !!leadershipId && !leadershipEnd;

  // Placeholder workflow: schedule is "Ready" if assignment + leadership are set; otherwise "Locked"
  const scheduleReady = hasAssignment && hasLeadership;

  return { hasAssignment, hasLeadership, scheduleReady };
}

function StatusPills({ row }: { row: any }) {
  const s = getStatusFlags(row);
  return (
    <div className="flex items-center justify-end gap-1">
      <MiniStatusPill
        label="A"
        ok={s.hasAssignment}
        title={s.hasAssignment ? "Assignment: set" : "Assignment: not set"}
      />
      <MiniStatusPill
        label="L"
        ok={s.hasLeadership}
        title={s.hasLeadership ? "Leadership: set" : "Leadership: not set"}
      />
      <MiniStatusPill
        label="S"
        ok={s.scheduleReady}
        title={s.scheduleReady ? "Schedule: ready" : "Schedule: locked"}
      />
    </div>
  );
}

export function RosterTable({
  roster,
  onRowOpen,
  pickName,
}: {
  roster: RosterRow[];
  onRowOpen: (row: RosterRow) => void;
  pickName: (row: RosterRow) => string;
}) {
  const totalTechs = roster.length;
  const companyTechs = roster.filter((r) => isITGCompanyAffiliation((r as any)?.co_name)).length;
  const contractorTechs = totalTechs - companyTechs;

  const pct = (n: number) => (totalTechs === 0 ? "0.0" : ((n / totalTechs) * 100).toFixed(1));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-y-1 text-sm">
        <span className="font-medium">Tech Count: {totalTechs}</span>
        <span className="mx-2 inline-block text-muted-foreground">&nbsp;•&nbsp;</span>
        <span>
          ITG: <span className="font-medium">{companyTechs}</span> ({pct(companyTechs)}%)
        </span>
        <span className="mx-2 inline-block text-muted-foreground">&nbsp;•&nbsp;</span>
        <span>
          BP: <span className="font-medium">{contractorTechs}</span> ({pct(contractorTechs)}%)
        </span>
      </div>

      <DataTable
        zebra
        hover
        // Template-driven, distributed columns that still respect content and truncate long text.
        layout="content"
        // IMPORTANT: no min-w-max here; it prevents fr columns from distributing and disables truncation.
        gridClassName="w-full min-w-[64rem] lg:min-w-0"
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
          <div
            className="whitespace-nowrap text-right"
            title="Status: A=Assignment, L=Leadership, S=Schedule (ready/locked)"
          >
            Status <span className="text-[10px] text-[var(--to-ink-muted)]">A/L/S</span>
          </div>
        </DataTableHeader>

        <DataTableBody zebra>
          {roster.map((r, idx) => (
            <DataTableRow
              key={(r as any).assignment_id ?? (r as any).person_id ?? idx}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Open roster details for ${((r as any)?.full_name ?? pickName(r)) || "tech"}`}
              onClick={() => onRowOpen(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onRowOpen(r);
              }}
            >
              <div className="whitespace-nowrap font-mono text-xs">{(r as any)?.tech_id ?? "—"}</div>

              <div className="min-w-0 truncate">{(r as any)?.full_name ?? pickName(r)}</div>

              <div className="whitespace-nowrap font-mono text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.mobile ?? "—"}
              </div>

              <div className="whitespace-nowrap truncate font-mono text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.person_nt_login ?? "—"}
              </div>

              <div className="whitespace-nowrap truncate font-mono text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.person_csg_id ?? "—"}
              </div>

              <div className="min-w-0 truncate text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.reports_to_full_name ?? "—"}
              </div>

              <div className="min-w-0 truncate text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.co_name ?? "—"}
              </div>

              <StatusPills row={r as any} />
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
