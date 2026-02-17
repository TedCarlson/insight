// apps/web/src/features/roster/components/RosterTable.tsx
"use client";

import type { CSSProperties } from "react";
import type { RosterRow } from "@/shared/lib/api";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";
import { useSession } from "@/state/session";
import { useRosterManageAccess } from "@/features/roster/hooks/useRosterManageAccess";

const rosterGridStyle: CSSProperties = {
  // Added Office column (human-read).
  gridTemplateColumns:
    "6rem minmax(12rem,1fr) 10rem 8rem 5rem 10rem minmax(0,1fr) minmax(0,1fr) 8rem",
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
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
      style={
        ok
          ? { background: "rgba(34, 197, 94, 0.14)", color: "var(--to-status-success)" }
          : { background: "rgba(249, 115, 22, 0.16)", color: "var(--to-status-warning)" }
      }
      title={title}
      aria-label={title}
    >
      {String(label ?? "").slice(0, 1).toUpperCase()}
    </span>
  );
}

function getReadinessFlags(r: any) {
  const personOk = !!String(r?.full_name ?? "").trim();

  const orgEnded = String(r?.person_pc_org_end_date ?? r?.pc_org_end_date ?? "").trim();
  const orgOk = !!String(r?.pc_org_id ?? "").trim() && !orgEnded;

  const assignmentEnd = String(r?.assignment_end_date ?? r?.end_date ?? "").trim();
  const assignmentActive = Boolean(r?.assignment_active ?? r?.active ?? true);
  const assignmentOk = !!String(r?.assignment_id ?? "").trim() && assignmentActive && !assignmentEnd;

  const leadershipEnd = String(r?.reports_to_end_date ?? r?.leadership_end_date ?? "").trim();
  const leadershipOk =
    !leadershipEnd &&
    (!!r?.reports_to_assignment_id ||
      !!r?.reports_to_person_id ||
      !!String(r?.reports_to_full_name ?? "").trim());

  return { personOk, orgOk, leadershipOk, assignmentOk };
}

function StatusPills({ row }: { row: any }) {
  const s = getReadinessFlags(row);
  return (
    <div className="flex items-center justify-end gap-1">
      <MiniStatusPill label="P" ok={s.personOk} title={s.personOk ? "Person: set" : "Person: not set"} />
      <MiniStatusPill label="O" ok={s.orgOk} title={s.orgOk ? "Org: set" : "Org: not set"} />
      <MiniStatusPill
        label="L"
        ok={s.leadershipOk}
        title={s.leadershipOk ? "Leadership: set" : "Leadership: not set"}
      />
      <MiniStatusPill
        label="A"
        ok={s.assignmentOk}
        title={s.assignmentOk ? "Assignments: set" : "Assignments: not set"}
      />
    </div>
  );
}

export function RosterTable({
  roster,
  onRowOpen,
  onRowQuickView,
  modifyMode = "open",
  pickName,
}: {
  roster: RosterRow[];
  modifyMode?: "open" | "locked";
  onRowOpen: (row: RosterRow) => void;
  onRowQuickView?: (row: RosterRow, anchorEl: HTMLElement) => void;
  pickName: (row: RosterRow) => string;
}) {
  const { isOwner } = useSession();
  const { allowed: canManageRoster } = useRosterManageAccess();
  const canEditRoster = isOwner || canManageRoster;

  const effectiveModifyMode: "open" | "locked" = canEditRoster ? modifyMode : "locked";

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
        layout="content"
        gridClassName="w-full min-w-[64rem] lg:min-w-0"
        gridStyle={rosterGridStyle}
      >
        <DataTableHeader>
          <div className="whitespace-nowrap">Tech ID</div>
          <div className="min-w-0">Name</div>
          <div className="whitespace-nowrap">Mobile</div>
          <div className="whitespace-nowrap">NT Login</div>
          <div className="whitespace-nowrap">CSG</div>
          <div className="whitespace-nowrap">Office</div>
          <div className="min-w-0">Reports To</div>
          <div className="min-w-0">Affiliation</div>
          <div
            className="whitespace-nowrap text-right"
            title="Status: A=Assignment, L=Leadership, S=Schedule (ready/locked)"
          >
            Status <span className="text-[10px] text-[var(--to-ink-muted)]">P/O/L/A</span>
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
              onClick={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
                else onRowOpen(r);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  const el = e.currentTarget as HTMLElement;
                  if (modifyMode === "locked") onRowQuickView?.(r, el);
                  else onRowOpen(r);
                }
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

              <div className="whitespace-nowrap truncate text-xs text-[var(--to-ink-muted)]">
                {(r as any)?.office_name ?? "—"}
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