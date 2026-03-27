import Sparkline from "@/features/tech/metrics/components/Sparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/shared/kpis/core/scorecardTypes";
import type { MetricsRangeKey as RangeKey } from "@/shared/kpis/core/types";

type Tile = ScorecardTile;

export type RepeatDebug = {
  requested_range?: string;
  distinct_fiscal_month_count?: number;
  distinct_fiscal_months_found?: string[];
  selected_month_count?: number;
  selected_final_rows: Array<{
    fiscal_end_date?: string;
    metric_date: string;
    batch_id?: string;
    inserted_at?: string;
    rows_in_month?: number;
    repeat_count: number | null;
    tc_count: number | null;
    repeat_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    inserted_at?: string;
    repeat_count: number | null;
    tc_count: number | null;
    repeat_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(tcs: number, repeats: number): number | null {
  if (tcs > 0) return (100 * repeats) / tcs;
  return null;
}

function computeRangeValue(
  rows: Array<{
    tc_count: number | null;
    repeat_count: number | null;
    repeat_rate: number | null;
  }>
): string {
  const tcs = rows.reduce((sum, row) => sum + (row.tc_count ?? 0), 0);
  const repeats = rows.reduce((sum, row) => sum + (row.repeat_count ?? 0), 0);

  if (tcs > 0) {
    return formatPct(computePct(tcs, repeats));
  }

  const fallbackRates = rows
    .map((row) => row.repeat_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function buildRepeatDrawerModel(args: {
  tile: Tile;
  repeatDebug: RepeatDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.repeatDebug?.selected_final_rows ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const previousRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows.slice(0, 12);

  const summaryRows: Array<{ label: string; value: string }> = [];

  if (args.activeRange === "FM") {
    summaryRows.push({
      label: "Current FM",
      value: computeRangeValue(currentRows),
    });
  } else if (args.activeRange === "PREVIOUS") {
    summaryRows.push({
      label: "Previous FM",
      value: computeRangeValue(previousRows),
    });
  } else if (args.activeRange === "3FM") {
    summaryRows.push({
      label: "Last 3 FM",
      value: computeRangeValue(last3Rows),
    });
  } else if (args.activeRange === "12FM") {
    summaryRows.push({
      label: "Last 12 FM",
      value: computeRangeValue(last12Rows),
    });
  }

  const totalTcs = selectedRows.reduce((sum, row) => sum + (row.tc_count ?? 0), 0);
  const totalRepeats = selectedRows.reduce(
    (sum, row) => sum + (row.repeat_count ?? 0),
    0
  );
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.tc_count != null && row.tc_count > 0
        ? formatPct(computePct(row.tc_count, row.repeat_count ?? 0))
        : formatPct(row.repeat_rate);

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date,
        rowPct,
        row.repeat_count ?? "—",
        row.tc_count ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalRepeats || "—", totalTcs || "—"],
  };

  return {
    summaryRows,
    chart: (
      <Sparkline
        values={(args.repeatDebug?.trend ?? []).map((t) => ({
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
          { key: "repeat_pct", label: "Repeat %", align: "right", widthClass: "90px" },
          { key: "repeats", label: "Repeats", align: "right", widthClass: "90px" },
          { key: "tcs", label: "TCs", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}