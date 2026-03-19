import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type MetDebug = {
  requested_range?: string;
  distinct_fiscal_month_count?: number;
  distinct_fiscal_months_found?: string[];
  selected_month_count?: number;
  selected_final_rows: Array<{
    fiscal_end_date?: string;
    metric_date: string;
    batch_id?: string;
    rows_in_month?: number;
    met_count: number | null;
    total_appts: number | null;
    met_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    met_count: number | null;
    total_appts: number | null;
    met_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(totalAppts: number, metCount: number): number | null {
  if (totalAppts > 0) return (100 * metCount) / totalAppts;
  return null;
}

function computeRangeValue(
  rows: Array<{
    total_appts: number | null;
    met_count: number | null;
    met_rate: number | null;
  }>
): string {
  const totalAppts = rows.reduce((sum, row) => sum + (row.total_appts ?? 0), 0);
  const metCount = rows.reduce((sum, row) => sum + (row.met_count ?? 0), 0);

  if (totalAppts > 0) {
    return formatPct(computePct(totalAppts, metCount));
  }

  const fallbackRates = rows
    .map((row) => row.met_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function buildMetDrawerModel(args: {
  tile: Tile;
  metDebug: MetDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.metDebug?.selected_final_rows ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows;

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Current FM", value: computeRangeValue(currentRows) },
  ];

  if (args.activeRange !== "FM") {
    summaryRows.push({
      label: "Last 3 FM",
      value: computeRangeValue(last3Rows),
    });
  }

  if (args.activeRange === "12FM") {
    summaryRows.push({
      label: "Last 12 FM",
      value: computeRangeValue(last12Rows),
    });
  }

  const totalAppts = selectedRows.reduce((sum, row) => sum + (row.total_appts ?? 0), 0);
  const totalMet = selectedRows.reduce((sum, row) => sum + (row.met_count ?? 0), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.total_appts != null && row.total_appts > 0
        ? formatPct(computePct(row.total_appts, row.met_count ?? 0))
        : formatPct(row.met_rate);

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date,
        rowPct,
        row.met_count ?? "—",
        row.total_appts ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalMet || "—", totalAppts || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.metDebug?.trend ?? []).map((t) => ({
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
          { key: "met_pct", label: "MET %", align: "right", widthClass: "90px" },
          { key: "met_count", label: "Met", align: "right", widthClass: "90px" },
          { key: "total_appts", label: "Appts", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}