import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type PurePassDebug = {
  requested_range: string;
  distinct_fiscal_month_count: number;
  distinct_fiscal_months_found: string[];
  selected_month_count: number;
  selected_final_rows: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    rows_in_month: number;
    pht_jobs: number | null;
    pure_pass: number | null;
    pure_pass_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    pht_jobs: number | null;
    pure_pass: number | null;
    pure_pass_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(jobs: number, purePass: number): number | null {
  if (jobs > 0) return (100 * purePass) / jobs;
  return null;
}

function computeRangeValue(
  rows: Array<{
    pht_jobs: number | null;
    pure_pass: number | null;
    pure_pass_rate: number | null;
  }>
): string {
  const jobs = rows.reduce((sum, row) => sum + (row.pht_jobs ?? 0), 0);
  const purePass = rows.reduce((sum, row) => sum + (row.pure_pass ?? 0), 0);

  if (jobs > 0) {
    return formatPct(computePct(jobs, purePass));
  }

  const fallbackRates = rows
    .map((row) => row.pure_pass_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(fallbackRates.reduce((s, v) => s + v, 0) / fallbackRates.length);
  }

  return "—";
}

export function buildPurePassDrawerModel(args: {
  tile: Tile;
  purePassDebug: PurePassDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.purePassDebug?.selected_final_rows ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows;

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Current FM", value: computeRangeValue(currentRows) },
  ];

  if (args.activeRange !== "FM") {
    summaryRows.push({ label: "Last 3 FM", value: computeRangeValue(last3Rows) });
  }

  if (args.activeRange === "12FM") {
    summaryRows.push({ label: "Last 12 FM", value: computeRangeValue(last12Rows) });
  }

  const totalJobs = selectedRows.reduce((sum, row) => sum + (row.pht_jobs ?? 0), 0);
  const totalPurePass = selectedRows.reduce((sum, row) => sum + (row.pure_pass ?? 0), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.pht_jobs != null && row.pht_jobs > 0
        ? formatPct(computePct(row.pht_jobs, row.pure_pass ?? 0))
        : formatPct(row.pure_pass_rate);

    return {
      key: `${row.fiscal_end_date}-${row.metric_date}-${row.batch_id}`,
      cells: [
        row.metric_date,
        rowPct,
        row.pht_jobs ?? "—",
        row.pure_pass ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalJobs || "—", totalPurePass || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.purePassDebug?.trend ?? []).map((t) => ({
          kpi_value: t.kpi_value,
          is_month_final: t.is_month_final,
          band_color:
            t.kpi_value != null && t.kpi_value >= 95
              ? "#22c55e"
              : t.kpi_value != null && t.kpi_value >= 90
                ? "#eab308"
                : "#ef4444",
        }))}
      />
    ),
    periodDetail: (
      <MetricPeriodDetailTable
        title="Period Detail"
        columns={[
          { key: "metric_date", label: "Metric Date" },
          { key: "pure_pass_pct", label: "Pure %", align: "right", widthClass: "90px" },
          { key: "pht_jobs", label: "PHT Jobs", align: "right", widthClass: "90px" },
          { key: "pure_pass", label: "Pure Pass", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}