import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type FtrDebug = {
  requested_range: string;
  distinct_fiscal_month_count: number;
  distinct_fiscal_months_found: string[];
  selected_month_count: number;
  selected_final_rows: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    inserted_at?: string;
    rows_in_month: number;
    total_ftr_contact_jobs: number | null;
    ftr_fail_jobs: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    inserted_at?: string;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(jobs: number, fails: number): number | null {
  if (jobs > 0) return 100 * (1 - fails / jobs);
  if (fails > 0) return 0;
  return null;
}

function computeRangeValue(
  rows: Array<{
    total_ftr_contact_jobs: number | null;
    ftr_fail_jobs: number | null;
  }>
): string {
  const jobs = rows.reduce(
    (sum, row) => sum + (row.total_ftr_contact_jobs ?? 0),
    0
  );
  const fails = rows.reduce((sum, row) => sum + (row.ftr_fail_jobs ?? 0), 0);

  return formatPct(computePct(jobs, fails));
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionFtr(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug = (args.payload as { debug?: FtrDebug } | null)?.debug ?? null;
  const selectedRows = debug?.selected_final_rows ?? [];
  const trend = debug?.trend ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const previousRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows.slice(0, 12);

  let headlineValue = "—";
  if (args.activeRange === "FM") headlineValue = computeRangeValue(currentRows);
  else if (args.activeRange === "PREVIOUS") headlineValue = computeRangeValue(previousRows);
  else if (args.activeRange === "3FM") headlineValue = computeRangeValue(last3Rows);
  else if (args.activeRange === "12FM") headlineValue = computeRangeValue(last12Rows);

  const totalJobs = selectedRows.reduce(
    (sum, row) => sum + (row.total_ftr_contact_jobs ?? 0),
    0
  );
  const totalFails = selectedRows.reduce(
    (sum, row) => sum + (row.ftr_fail_jobs ?? 0),
    0
  );
  const totalFtr = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct = formatPct(
      computePct(row.total_ftr_contact_jobs ?? 0, row.ftr_fail_jobs ?? 0)
    );

    return {
      key: `${row.fiscal_end_date}-${row.metric_date}-${row.batch_id}`,
      cells: [
        row.metric_date,
        rowPct,
        row.total_ftr_contact_jobs ?? "—",
        row.ftr_fail_jobs ?? "—",
      ],
    };
  });

  return {
    header: {
      title: "FTR %",
      valueDisplay: headlineValue,
      rangeLabel: mapRangeLabel(args.activeRange),
    },
    trend: {
      title: "Trend",
      badgeValue: totalFtr,
      currentValue: totalFtr,
      updatesCount: trend.length,
      monthsCount: debug?.selected_month_count ?? debug?.distinct_fiscal_month_count ?? null,
      rangeLabel: mapRangeLabel(args.activeRange),
      points: trend.map((t) => ({
        kpi_value: t.kpi_value,
        is_month_final: t.is_month_final,
        band_color:
          t.kpi_value != null && t.kpi_value >= 95
            ? "#22c55e"
            : t.kpi_value != null && t.kpi_value >= 90
              ? "#eab308"
              : "#ef4444",
      })),
    },
    periodDetail: {
      title: "Period Detail",
      columns: [
        { key: "metric_date", label: "Metric Date" },
        {
          key: "ftr_pct",
          label: "FTR %",
          align: "right",
          widthClass: "90px",
        },
        { key: "jobs", label: "Jobs", align: "right", widthClass: "90px" },
        { key: "fails", label: "Fails", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalFtr, totalJobs || "—", totalFails || "—"],
      },
    },
  };
}