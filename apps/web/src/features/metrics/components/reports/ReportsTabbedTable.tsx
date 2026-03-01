"use client";

import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";

type AnyRow = Record<string, any>;

type KpiDefLike = {
  kpi_key?: string;
  key?: string;
  kpiKey?: string;

  kpi_name?: string | null;
  label?: string | null;
  name?: string | null;

  format?: string | null; // "PERCENT" | "NUMBER" | etc (optional)
  show_in_table?: boolean | null;
};

type Props = {
  okRows: AnyRow[];
  nonOkRows: AnyRow[];
  kpis: KpiDefLike[];

  personNameById: Map<string, string>;
  personMetaById: Map<string, any>;
  preset: any;

  latestMetricDate: string;
  priorMetricDate: string | null;
  priorSnapshotByTechId: Map<string, any>;
};

function getKpiKey(k: KpiDefLike): string {
  return String(k.kpi_key ?? k.key ?? k.kpiKey ?? "").trim();
}

function metricFromPayload(row: AnyRow, kpi_key: string): number | null {
  if (!row) return null;

  // 1) direct (some banding/normalization may materialize values)
  const direct = row[kpi_key];
  if (direct != null) {
    if (typeof direct === "number") return Number.isFinite(direct) ? direct : null;
    const s = String(direct).trim();
    if (s) {
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
  }

  // 2) computed/raw json (main path)
  const comp = row?.computed_metrics_json ?? null;
  const raw = row?.raw_metrics_json ?? null;

  const v =
    (comp && typeof comp === "object" ? comp[kpi_key] : undefined) ??
    (raw && typeof raw === "object" ? raw[kpi_key] : undefined);

  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtNumber(v: number | null): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

function fmtMaybePercent(v: number | null, kpi: KpiDefLike): string {
  if (v == null) return "—";
  const f = String(kpi.format ?? "").toUpperCase();
  if (f.includes("PCT") || f.includes("PERCENT")) return v.toFixed(1);
  return fmtNumber(v);
}

function kpiLabel(k: KpiDefLike): string {
  return String(k.label ?? k.kpi_name ?? k.name ?? getKpiKey(k));
}

export default function ReportsTabbedTable(props: Props) {
  const { okRows, nonOkRows, kpis } = props;

  const [tab, setTab] = useState<"RANKING" | "OUTLIERS">("RANKING");

  const rows = tab === "RANKING" ? okRows : nonOkRows;

  const tabs = useMemo(
    () => [
      { value: "RANKING", label: "Ranking" },
      { value: "OUTLIERS", label: "Outliers" },
    ],
    []
  );

  const visibleKpis = (kpis ?? []).filter((k) => {
    const key = getKpiKey(k);
    if (!key) return false;
    if (k.show_in_table == null) return true;
    return Boolean(k.show_in_table);
  });

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Metrics (Ranking) · Tech count {rows.length}</div>

        <SegmentedControl value={tab} onChange={(v) => setTab(v as any)} options={tabs} size="sm" />
      </div>

      <div className="mt-3 overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--to-border)] text-[var(--to-ink-muted)]">
              <th className="text-left py-2 pr-3 font-medium">Tech</th>
              <th className="text-center py-2 px-3 font-medium">Rank</th>
              <th className="text-center py-2 px-3 font-medium">Weighted Score</th>

              {visibleKpis.map((k) => {
                const kk = getKpiKey(k);
                return (
                  <th key={kk} className="text-center py-2 px-3 font-medium whitespace-nowrap">
                    {kpiLabel(k)}
                  </th>
                );
              })}

              <th className="text-center py-2 pl-3 font-medium whitespace-nowrap">Total Jobs</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              const techId = String(r.tech_id ?? "—");
              const rank = r.rank_in_pc ?? r.rank_org ?? null;
              const score = r.weighted_score ?? r.composite_score ?? null;

              const totalJobs =
                metricFromPayload(r, "total_jobs") ??
                metricFromPayload(r, "Total Jobs") ??
                r.total_jobs ??
                null;

              return (
                <tr key={`${techId}-${idx}`} className={idx % 2 === 1 ? "bg-[var(--to-surface-2)]" : undefined}>
                  <td className="py-2 pr-3 font-medium">{techId}</td>
                  <td className="py-2 px-3 text-center">{rank ?? "—"}</td>
                  <td className="py-2 px-3 text-center">{fmtNumber(score)}</td>

                  {visibleKpis.map((k) => {
                    const kk = getKpiKey(k);
                    const v = metricFromPayload(r, kk);
                    return (
                      <td key={kk} className="py-2 px-3 text-center">
                        {fmtMaybePercent(v, k)}
                      </td>
                    );
                  })}

                  <td className="py-2 pl-3 text-center">{totalJobs ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}