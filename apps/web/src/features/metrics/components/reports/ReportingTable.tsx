// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/components/reports/ReportingTable.tsx

"use client";

import React from "react";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";

import { formatScore } from "@/features/metrics/lib/reports/format";
import { BandChip } from "./BandChip";
import { StatusMini } from "./StatusMini";
import type { BandKey } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

import { KpiSlicerProvider } from "./kpiSlicer/KpiSlicerProvider";
import { KpiSlicerTrigger } from "./kpiSlicer/KpiSlicerTrigger";

type PriorSnapshot = Record<string, number | null | undefined>;

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function fmtPct(n: number, denom: number): string {
  if (!Number.isFinite(n) || !Number.isFinite(denom) || denom <= 0) return "—";
  const pct = (n / denom) * 100;
  return `${pct.toFixed(1)}%`;
}

function fmtCount(n: any): string {
  const v = toNum(n);
  return v == null ? "—" : String(Math.round(v));
}

// IMPORTANT CHANGE:
// We no longer append "%" in the cell text. Put "%" in the column header/label instead.
function fmtCustomerKpi(k: KpiDef, value: any): string {
  const n = toNum(value);
  if (n === null) return "—";

  const key = String(k.key ?? "").toUpperCase();
  const label = String(k.label ?? "").toUpperCase();

  const isTNPS = key.includes("TNPS") || label.includes("TNPS");
  const isFTR = key.includes("FTR") || label.includes("FTR");
  const isTOOL = key.includes("TOOL") || label.includes("TOOL");

  if (isTNPS) return n.toFixed(2);
  if (isFTR || isTOOL) return n.toFixed(1); // <-- no "%"
  return n.toFixed(1);
}

function headerLabel(k: KpiDef): string {
  const raw = String(k.label ?? k.key ?? "").trim();
  if (!raw) return raw;

  // If label already has %, leave it alone.
  if (raw.includes("%")) return raw;

  const upper = raw.toUpperCase();
  const keyUpper = String(k.key ?? "").toUpperCase();

  const isFTR = upper.includes("FTR") || keyUpper.includes("FTR");
  const isTOOL = upper.includes("TOOL") || keyUpper.includes("TOOL");

  // Only append % for rate-style KPIs
  if (isFTR || isTOOL) return `${raw}%`;
  return raw;
}

function JobMixTooltip({
  total,
  installs,
  sros,
  tcs,
}: {
  total: number | null;
  installs: number | null;
  sros: number | null;
  tcs: number | null;
}) {
  const denom = total ?? 0;

  return (
    <div className="pointer-events-none absolute right-0 top-full mt-2 z-50 hidden group-hover:block">
      <div className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] shadow-lg px-3 py-2 text-xs">
        <div className="font-medium mb-1">Work Mix</div>

        <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-1">
          <div className="text-[var(--to-ink-muted)]">Total Jobs</div>
          <div className="font-mono text-right">{fmtCount(total)}</div>
          <div />

          <div className="text-[var(--to-ink-muted)]">Installs</div>
          <div className="font-mono text-right">{fmtCount(installs)}</div>
          <div className="font-mono text-right">{fmtPct(installs ?? 0, denom)}</div>

          <div className="text-[var(--to-ink-muted)]">SROs</div>
          <div className="font-mono text-right">{fmtCount(sros)}</div>
          <div className="font-mono text-right">{fmtPct(sros ?? 0, denom)}</div>

          <div className="text-[var(--to-ink-muted)]">TCs</div>
          <div className="font-mono text-right">{fmtCount(tcs)}</div>
          <div className="font-mono text-right">{fmtPct(tcs ?? 0, denom)}</div>
        </div>

        <div className="mt-2 text-[var(--to-ink-muted)]">% is based on Total Jobs.</div>
      </div>
    </div>
  );
}

function completionPctForRow(row: any, kpis: KpiDef[]): number {
  const total = kpis.length || 1;
  let complete = 0;

  for (const k of kpis) {
    const v = toNum(row?.[k.valueField]);
    const band = String(row?.[k.bandField] ?? "NO_DATA") as BandKey;

    // Count as complete if it has a numeric value OR it has any band other than NO_DATA
    if (v != null || band !== "NO_DATA") complete += 1;
  }

  return complete / total;
}

export function ReportingTable({
  rows,
  showStatus,
  personNameById,
  preset,
  kpis,
  slicerTitle,
  priorSnapshotByTechId,
}: {
  rows: any[];
  showStatus: boolean;
  personNameById: Map<string, string>;
  preset: Record<string, any>;
  kpis: KpiDef[];
  slicerTitle: string;
  priorSnapshotByTechId?: Map<string, PriorSnapshot>;
}) {
  // Completion % map is used as the *first-class tie breaker* (higher is better)
  const completionPctByTechId = React.useMemo(() => {
    const m = new Map<string, number>();

    // If duplicates exist for a tech_id, keep the max completion pct.
    for (const r of rows) {
      const tid = String(r?.tech_id ?? "");
      if (!tid) continue;

      const pct = completionPctForRow(r, kpis);
      const prev = m.get(tid);
      if (prev == null || pct > prev) m.set(tid, pct);
    }

    return m;
  }, [rows, kpis]);

  const completionPct = React.useCallback(
    (r: any) => completionPctByTechId.get(String(r?.tech_id ?? "")) ?? 0,
    [completionPctByTechId]
  );

  // IMPORTANT CHANGE:
  // Lower weighted_score is better => ASC.
  // Nulls always go to the bottom.
  // Tie-break #1: completion % DESC (higher completion wins)
  // Tie-break #2: tech_id ASC (stable)
  const stackSorter = React.useCallback(
    (a: any, b: any) => {
      const aw = toNum(a?.weighted_score);
      const bw = toNum(b?.weighted_score);

      const aNull = aw == null;
      const bNull = bw == null;
      if (aNull !== bNull) return aNull ? 1 : -1;

      const av = aw ?? 0;
      const bv = bw ?? 0;
      if (av !== bv) return av - bv; // ASC (lower is better)

      const ac = completionPct(a);
      const bc = completionPct(b);
      if (ac !== bc) return bc - ac; // DESC (higher completion first)

      return String(a?.tech_id ?? "").localeCompare(String(b?.tech_id ?? ""));
    },
    [completionPct]
  );

  const rankByTechId = React.useMemo(() => {
    if (showStatus) return new Map<string, number>();

    const sorted = [...rows].sort(stackSorter);

    const map = new Map<string, number>();
    let rank = 1;
    for (const r of sorted) {
      const tid = String(r?.tech_id ?? "");
      if (!tid) continue;
      if (!map.has(tid)) map.set(tid, rank++);
    }
    return map;
  }, [rows, showStatus, stackSorter]);

  const displayRows = React.useMemo(() => {
    if (showStatus) return rows;
    return [...rows].sort(stackSorter);
  }, [rows, showStatus, stackSorter]);

  const gridStyle = {
    gridTemplateColumns: [
      "minmax(260px, 340px)",
      "minmax(190px, 260px)",
      "64px",
      "110px",
      ...kpis.map(() => "minmax(120px, 1fr)"),
      "120px", // Total Jobs
    ].join(" "),
  } as const;

  return (
    <KpiSlicerProvider title={slicerTitle} rows={rows} kpis={kpis} preset={preset}>
      <DataTable zebra hover layout="fixed">
        <DataTableHeader gridStyle={gridStyle}>
          <div>Tech • Name</div>
          <div>Reports To</div>
          <div className="text-center">Rank</div>
          <div className="text-right font-mono">Weighted Score</div>
          {kpis.map((k) => (
            <div key={k.key} className="text-center">
              <KpiSlicerTrigger kpiKey={k.key}>{headerLabel(k)}</KpiSlicerTrigger>
            </div>
          ))}
          <div className="text-right">Total Jobs</div>
        </DataTableHeader>

        <DataTableBody zebra>
          {displayRows.map((r, idx) => {
            const pid = r.person_id ? String(r.person_id) : "";
            const rid = r.reports_to_person_id ? String(r.reports_to_person_id) : "";

            const fullName = pid ? personNameById.get(pid) ?? "—" : "—";
            const reportsToName = rid ? personNameById.get(rid) ?? "—" : "—";

            const rowKey = `${r.tech_id}-${idx}`;

            const totalJobs = toNum(r.total_jobs);
            const installs = toNum(r.installs);
            const sros = toNum(r.sros);
            const tcs = toNum(r.tcs);

            return (
              <DataTableRow key={rowKey} gridStyle={gridStyle}>
                <div>
                  <span className="font-mono">{r.tech_id}</span>
                  <span className="mx-2">•</span>
                  {fullName}
                  {showStatus && r.status_badge && <StatusMini status={r.status_badge} />}
                </div>

                <div>{reportsToName}</div>

                <div className="text-center font-mono">
                  {showStatus ? "" : rankByTechId.get(String(r.tech_id)) ?? ""}
                </div>

                <div className="text-right font-mono">{formatScore(r.weighted_score)}</div>

                {kpis.map((k) => (
                  <div key={k.key} className="text-center font-mono">
                    <BandChip
                      bandKey={(r?.[k.bandField] ?? "NO_DATA") as BandKey}
                      valueText={fmtCustomerKpi(k, r?.[k.valueField])}
                      preset={preset}
                    />
                  </div>
                ))}

                <div className="text-right font-mono relative group">
                  {totalJobs == null ? "—" : String(Math.round(totalJobs))}
                  <JobMixTooltip total={totalJobs} installs={installs} sros={sros} tcs={tcs} />
                </div>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </KpiSlicerProvider>
  );
}