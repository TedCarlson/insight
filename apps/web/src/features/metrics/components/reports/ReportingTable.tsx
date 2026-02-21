// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/components/reports/ReportingTable.tsx

"use client";

import React from "react";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";

import { delta, trendFromDelta, fmtDelta as fmtDeltaNum } from "@/features/metrics/lib/reports/rollup";

import { BandChip } from "./BandChip";
import { StatusMini } from "./StatusMini";
import type { BandKey } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

import { KpiSlicerProvider } from "./kpiSlicer/KpiSlicerProvider";
import { KpiSlicerTrigger } from "./kpiSlicer/KpiSlicerTrigger";

export type PersonMeta = {
  affiliation_kind: "company" | "contractor" | null;
  affiliation_name: string | null;
};

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

function fmtCustomerKpi(k: KpiDef, value: any): string {
  const n = toNum(value);
  if (n === null) return "—";

  const key = String(k.key ?? "").toUpperCase();
  const label = String(k.label ?? "").toUpperCase();

  const isTNPS = key.includes("TNPS") || label.includes("TNPS");
  const isFTR = key.includes("FTR") || label.includes("FTR");
  const isTOOL = key.includes("TOOL") || label.includes("TOOL");

  if (isTNPS) return n.toFixed(2);
  if (isFTR || isTOOL) return n.toFixed(1);
  return n.toFixed(1);
}

function deltaDigits(k: KpiDef): number {
  const key = String(k.key ?? "").toUpperCase();
  const label = String(k.label ?? "").toUpperCase();
  const isTNPS = key.includes("TNPS") || label.includes("TNPS");
  return isTNPS ? 2 : 1;
}

function headerLabel(k: KpiDef): string {
  const raw = String(k.label ?? k.key ?? "").trim();
  if (!raw) return raw;
  if (raw.includes("%")) return raw;

  const upper = raw.toUpperCase();
  const keyUpper = String(k.key ?? "").toUpperCase();

  const isFTR = upper.includes("FTR") || keyUpper.includes("FTR");
  const isTOOL = upper.includes("TOOL") || keyUpper.includes("TOOL");

  if (isFTR || isTOOL) return `${raw}%`;
  return raw;
}

function fmtWs100(v: any): string {
  const n = toNum(v);
  if (n == null) return "—";
  return (n * 100).toFixed(3);
}

function DeltaMini({ current, prior, digits }: { current: number | null; prior: number | null; digits: number }) {
  const d = delta(current, prior);
  const dir = trendFromDelta(d, 0.0001);
  if (!dir || d === null) return null;

  const glyph = dir === "UP" ? "↑" : dir === "DOWN" ? "↓" : "→";
  const color = dir === "UP" ? "text-emerald-600" : dir === "DOWN" ? "text-red-600" : "text-[var(--to-ink-muted)]";

  return (
    <div className={["mt-1 inline-flex items-center gap-1 text-[11px] leading-none", color].join(" ")}>
      <span aria-hidden="true">{glyph}</span>
      <span className="font-mono tabular-nums">{fmtDeltaNum(d, digits)}</span>
    </div>
  );
}

function HoverMetaTooltip({
  reportsToName,
  affiliationKind,
  affiliationName,
}: {
  reportsToName: string;
  affiliationKind: "company" | "contractor" | null;
  affiliationName: string | null;
}) {
  const kindLabel = affiliationKind === "company" ? "Company" : affiliationKind === "contractor" ? "Contractor" : null;

  return (
    <div className="pointer-events-none absolute left-0 top-full mt-2 z-50 hidden group-hover:block">
      <div className="min-w-[240px] rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] shadow-lg px-3 py-2 text-xs">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <div className="text-[var(--to-ink-muted)]">Reports To</div>
          <div className="font-medium">{reportsToName || "—"}</div>

          <div className="text-[var(--to-ink-muted)]">Affiliation</div>
          <div className="font-medium">
            {affiliationName ? (
              <>
                {affiliationName}
                {kindLabel ? <span className="text-[var(--to-ink-muted)]"> • {kindLabel}</span> : null}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
    if (v != null || band !== "NO_DATA") complete += 1;
  }

  return complete / total;
}

export function ReportingTable({
  rows,
  showStatus,
  personNameById,
  personMetaById,
  preset,
  kpis,
  slicerTitle,
  priorSnapshotByTechId,
}: {
  rows: any[];
  showStatus: boolean;
  personNameById: Map<string, string>;
  personMetaById: Map<string, PersonMeta>;
  preset: Record<string, any>;
  kpis: KpiDef[];
  slicerTitle: string;
  priorSnapshotByTechId?: Map<string, PriorSnapshot>;
}) {
  const completionPctByTechId = React.useMemo(() => {
    const m = new Map<string, number>();
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

  const stackSorter = React.useCallback(
    (a: any, b: any) => {
      const aw = toNum(a?.weighted_score);
      const bw = toNum(b?.weighted_score);

      const aNull = aw == null;
      const bNull = bw == null;
      if (aNull !== bNull) return aNull ? 1 : -1;

      const av = aw ?? 0;
      const bv = bw ?? 0;
      if (av !== bv) return av - bv;

      const ac = completionPct(a);
      const bc = completionPct(b);
      if (ac !== bc) return bc - ac;

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
      "64px",
      "118px",
      ...kpis.map(() => "minmax(120px, 1fr)"),
      "120px",
    ].join(" "),
  } as const;

  return (
    <KpiSlicerProvider title={slicerTitle} rows={rows} kpis={kpis} preset={preset}>
      <DataTable zebra hover layout="fixed">
        <DataTableHeader gridStyle={gridStyle}>
          <div>Tech • Name</div>
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

            const meta = pid ? personMetaById.get(pid) ?? null : null;

            const rowKey = `${r.tech_id}-${idx}`;

            const totalJobs = toNum(r.total_jobs);
            const installs = toNum(r.installs);
            const sros = toNum(r.sros);
            const tcs = toNum(r.tcs);

            const techId = String(r.tech_id ?? "");
            const priorSnap = priorSnapshotByTechId?.get(techId);

            return (
              <DataTableRow key={rowKey} gridStyle={gridStyle}>
                <div className="relative group">
                  <span className="font-mono">{r.tech_id}</span>
                  <span className="mx-2">•</span>
                  {fullName}
                  {showStatus && r.status_badge && <StatusMini status={r.status_badge} />}
                  <HoverMetaTooltip
                    reportsToName={reportsToName}
                    affiliationKind={meta?.affiliation_kind ?? null}
                    affiliationName={meta?.affiliation_name ?? null}
                  />
                </div>

                <div className="text-center font-mono">{showStatus ? "" : rankByTechId.get(String(r.tech_id)) ?? ""}</div>

                <div className="text-right font-mono tabular-nums">{fmtWs100(r.weighted_score)}</div>

                {kpis.map((k) => {
                  const cur = toNum(r?.[k.valueField]);
                  const prev = toNum(priorSnap?.[String(k.valueField)]);
                  return (
                    <div key={k.key} className="text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="font-mono">
                          <BandChip
                            bandKey={(r?.[k.bandField] ?? "NO_DATA") as BandKey}
                            valueText={fmtCustomerKpi(k, r?.[k.valueField])}
                            preset={preset}
                          />
                        </div>
                        <DeltaMini current={cur} prior={prev} digits={deltaDigits(k)} />
                      </div>
                    </div>
                  );
                })}

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