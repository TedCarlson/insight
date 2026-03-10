"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { RosterRow } from "@/shared/lib/api";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";
import { useSession } from "@/state/session";
import { useRosterManageAccess } from "@/features/roster/hooks/useRosterManageAccess";
import { useOrg } from "@/state/org";

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const fullGridStyle: CSSProperties = {
  minWidth: "86rem",
  gridTemplateColumns:
    "7rem minmax(16rem,1.7fr) 10.5rem 10rem 8rem 9rem minmax(12rem,1fr) minmax(11rem,1fr) 12rem",
};

const compactGridStyle: CSSProperties = {
  minWidth: "64rem",
  gridTemplateColumns: "7rem minmax(15rem,1.6fr) 9rem minmax(12rem,1fr) 12rem",
};

function formatPhone(v: unknown) {
  const raw = String(v ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "—";

  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return raw;

  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6);
  return `(${a}) ${b}-${c}`;
}

type Pattern = {
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

type PatternRow = Pattern & {
  assignment_id: string | null;
  tech_id: string | null;
};

function on(v: unknown) {
  return v === true;
}

function hasAny(p: Pattern | null) {
  if (!p) return false;
  return on(p.sun) || on(p.mon) || on(p.tue) || on(p.wed) || on(p.thu) || on(p.fri) || on(p.sat);
}

const CHIP = { size: 24, gap: 6, font: 10 };

const STYLE_ON = {
  background: "rgba(34, 197, 94, 0.18)",
  color: "var(--to-status-success)",
  border: "1px solid rgba(34, 197, 94, 0.16)",
};

const STYLE_OFF = {
  background: "rgba(245, 158, 11, 0.16)",
  color: "var(--to-status-warning)",
  border: "1px solid rgba(245, 158, 11, 0.14)",
};

const STYLE_NONE = {
  background: "rgba(148, 163, 184, 0.08)",
  color: "var(--to-ink-muted)",
  border: "1px solid rgba(148, 163, 184, 0.12)",
};

function MetaLine(props: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--to-ink-muted)]">
        {props.label}
      </span>
      <span className="min-w-0 truncate text-[13px] text-[var(--to-ink)]">{props.value}</span>
    </div>
  );
}

function LegendPill({ label, kind }: { label: string; kind: "on" | "off" }) {
  const dotStyle = kind === "on" ? STYLE_ON : STYLE_OFF;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-[var(--to-border)] bg-[var(--to-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--to-ink)]"
      aria-label={`${label} legend`}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 8,
          height: 8,
          background: dotStyle.background,
          border: dotStyle.border,
        }}
      />
      {label}
    </span>
  );
}

function ScheduleWeek({
  pattern,
  align = "end",
}: {
  pattern: Pattern | null;
  align?: "start" | "end";
}) {
  const days = useMemo(
    () =>
      [
        ["sun", "U"],
        ["mon", "M"],
        ["tue", "T"],
        ["wed", "W"],
        ["thu", "H"],
        ["fri", "F"],
        ["sat", "S"],
      ] as const,
    []
  );

  const any = hasAny(pattern);

  return (
    <div className={cls("flex", align === "start" ? "justify-start" : "justify-end")}>
      <div className="grid grid-cols-7" style={{ gap: CHIP.gap, justifyItems: "center" }}>
        {days.map(([k, label]) => {
          const active = pattern ? on((pattern as any)[k]) : false;
          const style = !any ? STYLE_NONE : active ? STYLE_ON : STYLE_OFF;

          return (
            <div
              key={k}
              className="flex items-center justify-center rounded-[7px] text-[10px] font-semibold"
              style={{
                width: CHIP.size,
                height: CHIP.size,
                lineHeight: "1",
                background: style.background,
                color: style.color,
                border: style.border,
              }}
              title={!any ? `No baseline pattern` : active ? `Scheduled: ${label}` : `Off: ${label}`}
              aria-label={!any ? `No baseline pattern` : active ? `Scheduled ${label}` : `Off ${label}`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRowKey(r: RosterRow, idx: number) {
  return String((r as any).assignment_id ?? (r as any).person_id ?? idx);
}

function getPatternForRow(
  r: RosterRow,
  schedByAssignment: Map<string, Pattern>,
  schedByTech: Map<string, Pattern>
) {
  const assignmentId = String((r as any)?.assignment_id ?? "").trim();
  const techId = String((r as any)?.tech_id ?? "").trim();
  return (assignmentId && schedByAssignment.get(assignmentId)) || (techId && schedByTech.get(techId)) || null;
}

function useRosterSchedules(roster: RosterRow[]) {
  const { selectedPcOrgId } = useOrg() as any;

  const pcOrgId =
    String(selectedPcOrgId ?? "").trim() ||
    String((roster?.[0] as any)?.pc_org_id ?? (roster?.[0] as any)?.person_pc_org_id ?? "").trim();

  const [schedByAssignment, setSchedByAssignment] = useState<Map<string, Pattern>>(new Map());
  const [schedByTech, setSchedByTech] = useState<Map<string, Pattern>>(new Map());

  useEffect(() => {
    let alive = true;

    if (!pcOrgId) {
      setSchedByAssignment(new Map());
      setSchedByTech(new Map());
      return;
    }

    async function load() {
      try {
        const res = await fetch("/api/roster/schedule-pattern", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pc_org_id: pcOrgId }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Failed to load schedule pattern");

        const rows = (Array.isArray(json?.rows) ? json.rows : []) as PatternRow[];

        const byAssignment = new Map<string, Pattern>();
        const byTech = new Map<string, Pattern>();

        for (const r of rows) {
          const p: Pattern = {
            sun: r.sun ?? null,
            mon: r.mon ?? null,
            tue: r.tue ?? null,
            wed: r.wed ?? null,
            thu: r.thu ?? null,
            fri: r.fri ?? null,
            sat: r.sat ?? null,
          };

          const assignmentId = String(r.assignment_id ?? "").trim();
          const techId = String(r.tech_id ?? "").trim();

          if (assignmentId) byAssignment.set(assignmentId, p);
          if (techId) byTech.set(techId, p);
        }

        if (!alive) return;
        setSchedByAssignment(byAssignment);
        setSchedByTech(byTech);
      } catch {
        if (!alive) return;
        setSchedByAssignment(new Map());
        setSchedByTech(new Map());
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [pcOrgId]);

  return { schedByAssignment, schedByTech };
}

function FullRosterTable(props: {
  roster: RosterRow[];
  pickName: (row: RosterRow) => string;
  effectiveModifyMode: "open" | "locked";
  onRowOpen: (row: RosterRow) => void;
  onRowQuickView?: (row: RosterRow, anchorEl: HTMLElement) => void;
  schedByAssignment: Map<string, Pattern>;
  schedByTech: Map<string, Pattern>;
}) {
  const { roster, pickName, effectiveModifyMode, onRowOpen, onRowQuickView, schedByAssignment, schedByTech } = props;

  return (
    <DataTable zebra hover layout="fixed" gridStyle={fullGridStyle}>
      <DataTableHeader className="text-[11px] uppercase tracking-[0.08em]">
        <div className="whitespace-nowrap">Tech ID</div>
        <div>Name</div>
        <div className="whitespace-nowrap">Mobile</div>
        <div className="whitespace-nowrap">NT Login</div>
        <div className="whitespace-nowrap">CSG</div>
        <div className="whitespace-nowrap">Office</div>
        <div>Reports To</div>
        <div>Affiliation</div>
        <div className="text-right">Schedule</div>
      </DataTableHeader>

      <DataTableBody zebra>
        {roster.map((r, idx) => {
          const pattern = getPatternForRow(r, schedByAssignment, schedByTech);
          const fullName = (r as any)?.full_name ?? pickName(r) ?? "—";

          return (
            <DataTableRow
              key={getRowKey(r, idx)}
              className="cursor-pointer text-[13px] text-[var(--to-ink)]"
              role="button"
              tabIndex={0}
              aria-label={`Open roster details for ${fullName || "tech"}`}
              onClick={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
                else onRowOpen(r);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  const el = e.currentTarget as HTMLElement;
                  if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
                  else onRowOpen(r);
                }
              }}
            >
              <div className="font-mono text-[13px] tabular-nums text-[var(--to-ink)]">{(r as any)?.tech_id ?? "—"}</div>

              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--to-ink)]">{fullName}</div>
              </div>

              <div className="whitespace-nowrap text-[var(--to-ink)]">{formatPhone((r as any)?.mobile)}</div>

              <div className="truncate font-mono text-[12px] text-[var(--to-ink-muted)]">
                {(r as any)?.person_nt_login ?? "—"}
              </div>

              <div className="truncate font-mono text-[12px] text-[var(--to-ink-muted)]">
                {(r as any)?.person_csg_id ?? "—"}
              </div>

              <div className="truncate text-[var(--to-ink)]">{(r as any)?.office_name ?? "—"}</div>

              <div className="truncate text-[var(--to-ink)]">{(r as any)?.reports_to_full_name ?? "—"}</div>

              <div className="truncate text-[var(--to-ink)]">{(r as any)?.co_name ?? "—"}</div>

              <ScheduleWeek pattern={pattern} />
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}

function CompactRosterTable(props: {
  roster: RosterRow[];
  pickName: (row: RosterRow) => string;
  effectiveModifyMode: "open" | "locked";
  onRowOpen: (row: RosterRow) => void;
  onRowQuickView?: (row: RosterRow, anchorEl: HTMLElement) => void;
  schedByAssignment: Map<string, Pattern>;
  schedByTech: Map<string, Pattern>;
}) {
  const { roster, pickName, effectiveModifyMode, onRowOpen, onRowQuickView, schedByAssignment, schedByTech } = props;

  return (
    <DataTable zebra hover layout="fixed" gridStyle={compactGridStyle}>
      <DataTableHeader className="text-[11px] uppercase tracking-[0.08em]">
        <div className="whitespace-nowrap">Tech ID</div>
        <div>Person</div>
        <div className="whitespace-nowrap">Office</div>
        <div>Reports To</div>
        <div className="text-right">Schedule</div>
      </DataTableHeader>

      <DataTableBody zebra>
        {roster.map((r, idx) => {
          const pattern = getPatternForRow(r, schedByAssignment, schedByTech);
          const fullName = (r as any)?.full_name ?? pickName(r) ?? "—";
          const affiliation = String((r as any)?.co_name ?? "—");

          return (
            <DataTableRow
              key={getRowKey(r, idx)}
              className="cursor-pointer text-[13px] text-[var(--to-ink)]"
              role="button"
              tabIndex={0}
              aria-label={`Open roster details for ${fullName || "tech"}`}
              onClick={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
                else onRowOpen(r);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  const el = e.currentTarget as HTMLElement;
                  if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
                  else onRowOpen(r);
                }
              }}
            >
              <div className="font-mono text-[13px] tabular-nums text-[var(--to-ink)]">{(r as any)?.tech_id ?? "—"}</div>

              <div className="min-w-0 py-2">
                <div className="truncate text-[14px] font-semibold text-[var(--to-ink)]">{fullName}</div>
                <div className="mt-1 truncate text-[12px] text-[var(--to-ink-muted)]">{affiliation}</div>
              </div>

              <div className="truncate text-[var(--to-ink)]">{(r as any)?.office_name ?? "—"}</div>

              <div className="truncate text-[var(--to-ink)]">{(r as any)?.reports_to_full_name ?? "—"}</div>

              <ScheduleWeek pattern={pattern} />
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}

function MobileRosterCards(props: {
  roster: RosterRow[];
  pickName: (row: RosterRow) => string;
  effectiveModifyMode: "open" | "locked";
  onRowOpen: (row: RosterRow) => void;
  onRowQuickView?: (row: RosterRow, anchorEl: HTMLElement) => void;
  schedByAssignment: Map<string, Pattern>;
  schedByTech: Map<string, Pattern>;
}) {
  const { roster, pickName, effectiveModifyMode, onRowOpen, onRowQuickView, schedByAssignment, schedByTech } = props;

  return (
    <div className="space-y-3">
      {roster.map((r, idx) => {
        const pattern = getPatternForRow(r, schedByAssignment, schedByTech);
        const fullName = (r as any)?.full_name ?? pickName(r) ?? "—";

        return (
          <button
            key={getRowKey(r, idx)}
            type="button"
            className="w-full rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4 text-left transition-colors hover:bg-[var(--to-surface-2)]"
            aria-label={`Open roster details for ${fullName || "tech"}`}
            onClick={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (effectiveModifyMode === "locked") onRowQuickView?.(r, el);
              else onRowOpen(r);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-[var(--to-ink)]">{fullName}</div>
                <div className="mt-1 font-mono text-[12px] text-[var(--to-ink-muted)]">
                  Tech ID {(r as any)?.tech_id ?? "—"}
                </div>
              </div>

              <div className="shrink-0 rounded-full border border-[var(--to-border)] bg-[var(--to-surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--to-ink)]">
                {(r as any)?.office_name ?? "—"}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <MetaLine label="Mobile" value={formatPhone((r as any)?.mobile)} />
              <MetaLine label="Reports" value={String((r as any)?.reports_to_full_name ?? "—")} />
              <MetaLine label="Affil" value={String((r as any)?.co_name ?? "—")} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--to-border)] pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--to-ink-muted)]">
                Schedule
              </div>
              <ScheduleWeek pattern={pattern} align="start" />
            </div>
          </button>
        );
      })}
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

  const { schedByAssignment, schedByTech } = useRosterSchedules(roster);

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--to-ink)]">Roster</div>
          <div className="text-xs text-[var(--to-ink-muted)]">
            Full table on large screens, condensed grid on laptop, cards on small screens.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LegendPill label="On" kind="on" />
          <LegendPill label="Off" kind="off" />
        </div>
      </div>

      <div className="hidden xl:block">
        <FullRosterTable
          roster={roster}
          pickName={pickName}
          effectiveModifyMode={effectiveModifyMode}
          onRowOpen={onRowOpen}
          onRowQuickView={onRowQuickView}
          schedByAssignment={schedByAssignment}
          schedByTech={schedByTech}
        />
      </div>

      <div className="hidden md:block xl:hidden">
        <CompactRosterTable
          roster={roster}
          pickName={pickName}
          effectiveModifyMode={effectiveModifyMode}
          onRowOpen={onRowOpen}
          onRowQuickView={onRowQuickView}
          schedByAssignment={schedByAssignment}
          schedByTech={schedByTech}
        />
      </div>

      <div className="md:hidden">
        <MobileRosterCards
          roster={roster}
          pickName={pickName}
          effectiveModifyMode={effectiveModifyMode}
          onRowOpen={onRowOpen}
          onRowQuickView={onRowQuickView}
          schedByAssignment={schedByAssignment}
          schedByTech={schedByTech}
        />
      </div>
    </div>
  );
}