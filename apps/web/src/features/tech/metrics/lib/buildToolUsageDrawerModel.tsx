import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type ToolUsageDebug = {
  requested_range: string;
  distinct_fiscal_month_count: number;
  distinct_fiscal_months_found: string[];
  selected_month_count: number;
  selected_final_rows: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    rows_in_month: number;
    tu_eligible_jobs: number | null;
    tu_compliant_jobs: number | null;
    tool_usage_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    tu_eligible_jobs: number | null;
    tu_compliant_jobs: number | null;
    tool_usage_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(eligible: number, compliant: number): number | null {
  if (eligible > 0) return (100 * compliant) / eligible;
  return null;
}

function computeRangeValue(
  rows: Array<{
    tu_eligible_jobs: number | null;
    tu_compliant_jobs: number | null;
    tool_usage_rate: number | null;
  }>
): string {
  const eligible = rows.reduce((sum, row) => sum + (row.tu_eligible_jobs ?? 0), 0);
  const compliant = rows.reduce((sum, row) => sum + (row.tu_compliant_jobs ?? 0), 0);

  if (eligible > 0) {
    return formatPct(computePct(eligible, compliant));
  }

  const fallbackRates = rows
    .map((row) => row.tool_usage_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function buildToolUsageDrawerModel(args: {
  tile: Tile;
  toolUsageDebug: ToolUsageDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.toolUsageDebug?.selected_final_rows ?? [];

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

  const totalEligible = selectedRows.reduce(
    (sum, row) => sum + (row.tu_eligible_jobs ?? 0),
    0
  );
  const totalCompliant = selectedRows.reduce(
    (sum, row) => sum + (row.tu_compliant_jobs ?? 0),
    0
  );
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.tu_eligible_jobs != null && row.tu_eligible_jobs > 0
        ? formatPct(computePct(row.tu_eligible_jobs, row.tu_compliant_jobs ?? 0))
        : formatPct(row.tool_usage_rate);

    return {
      key: `${row.fiscal_end_date}-${row.metric_date}-${row.batch_id}`,
      cells: [
        row.metric_date,
        rowPct,
        row.tu_eligible_jobs ?? "—",
        row.tu_compliant_jobs ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalEligible || "—", totalCompliant || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.toolUsageDebug?.trend ?? []).map((t) => ({
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
          { key: "tool_usage_pct", label: "Tool %", align: "right", widthClass: "90px" },
          { key: "eligible", label: "Eligible", align: "right", widthClass: "90px" },
          { key: "compliant", label: "Compliant", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}