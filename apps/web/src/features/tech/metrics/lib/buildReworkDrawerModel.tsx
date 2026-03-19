import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type ReworkDebug = {
  requested_range?: string;
  distinct_fiscal_month_count?: number;
  distinct_fiscal_months_found?: string[];
  selected_month_count?: number;
  selected_final_rows: Array<{
    fiscal_end_date?: string;
    metric_date: string;
    batch_id?: string;
    rows_in_month?: number;
    rework_count: number | null;
    total_appts: number | null;
    rework_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    rework_count: number | null;
    total_appts: number | null;
    rework_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(totalAppts: number, reworkCount: number): number | null {
  if (totalAppts > 0) return (100 * reworkCount) / totalAppts;
  return null;
}

function computeRangeValue(
  rows: Array<{
    total_appts: number | null;
    rework_count: number | null;
    rework_rate: number | null;
  }>
): string {
  const totalAppts = rows.reduce((sum, row) => sum + (row.total_appts ?? 0), 0);
  const reworkCount = rows.reduce((sum, row) => sum + (row.rework_count ?? 0), 0);

  if (totalAppts > 0) {
    return formatPct(computePct(totalAppts, reworkCount));
  }

  const fallbackRates = rows
    .map((row) => row.rework_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function buildReworkDrawerModel(args: {
  tile: Tile;
  reworkDebug: ReworkDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.reworkDebug?.selected_final_rows ?? [];

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
  const totalRework = selectedRows.reduce((sum, row) => sum + (row.rework_count ?? 0), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.total_appts != null && row.total_appts > 0
        ? formatPct(computePct(row.total_appts, row.rework_count ?? 0))
        : formatPct(row.rework_rate);

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date,
        rowPct,
        row.rework_count ?? "—",
        row.total_appts ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalRework || "—", totalAppts || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.reworkDebug?.trend ?? []).map((t) => ({
          kpi_value: t.kpi_value,
          is_month_final: t.is_month_final,
          band_color:
            t.kpi_value != null && t.kpi_value <= 5
              ? "#22c55e"
              : t.kpi_value != null && t.kpi_value <= 8
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
          { key: "rework_pct", label: "Rework %", align: "right", widthClass: "90px" },
          { key: "rework_count", label: "Rework", align: "right", widthClass: "90px" },
          { key: "total_appts", label: "Appts", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}