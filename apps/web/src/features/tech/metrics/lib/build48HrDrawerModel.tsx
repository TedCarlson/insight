import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type Callback48HrDebug = {
  requested_range?: string;
  distinct_fiscal_month_count?: number;
  distinct_fiscal_months_found?: string[];
  selected_month_count?: number;
  selected_final_rows: Array<{
    fiscal_end_date?: string;
    metric_date: string;
    batch_id?: string;
    rows_in_month?: number;
    contact_orders_48hr: number | null;
    eligible_jobs_48hr: number | null;
    callback_rate_48hr: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    contact_orders_48hr: number | null;
    eligible_jobs_48hr: number | null;
    callback_rate_48hr: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(eligible: number, orders: number): number | null {
  if (eligible > 0) return (100 * orders) / eligible;
  return null;
}

function computeRangeValue(
  rows: Array<{
    eligible_jobs_48hr: number | null;
    contact_orders_48hr: number | null;
    callback_rate_48hr: number | null;
  }>
): string {
  const eligible = rows.reduce((sum, row) => sum + (row.eligible_jobs_48hr ?? 0), 0);
  const orders = rows.reduce((sum, row) => sum + (row.contact_orders_48hr ?? 0), 0);

  if (eligible > 0) {
    return formatPct(computePct(eligible, orders));
  }

  const fallbackRates = rows
    .map((row) => row.callback_rate_48hr)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function build48HrDrawerModel(args: {
  tile: Tile;
  callback48HrDebug: Callback48HrDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.callback48HrDebug?.selected_final_rows ?? [];

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
    (sum, row) => sum + (row.eligible_jobs_48hr ?? 0),
    0
  );
  const totalOrders = selectedRows.reduce(
    (sum, row) => sum + (row.contact_orders_48hr ?? 0),
    0
  );
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.eligible_jobs_48hr != null && row.eligible_jobs_48hr > 0
        ? formatPct(computePct(row.eligible_jobs_48hr, row.contact_orders_48hr ?? 0))
        : formatPct(row.callback_rate_48hr);

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date,
        rowPct,
        row.contact_orders_48hr ?? "—",
        row.eligible_jobs_48hr ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalOrders || "—", totalEligible || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.callback48HrDebug?.trend ?? []).map((t) => ({
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
          { key: "callback_pct", label: "48Hr %", align: "right", widthClass: "90px" },
          { key: "orders", label: "Orders", align: "right", widthClass: "90px" },
          { key: "eligible", label: "Eligible", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}