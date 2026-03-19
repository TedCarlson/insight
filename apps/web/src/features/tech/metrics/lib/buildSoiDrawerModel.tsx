import FtrSparkline from "@/features/tech/metrics/components/FtrSparkline";
import MetricPeriodDetailTable from "@/features/tech/metrics/components/MetricPeriodDetailTable";
import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

export type SoiDebug = {
  requested_range?: string;
  distinct_fiscal_month_count?: number;
  distinct_fiscal_months_found?: string[];
  selected_month_count?: number;
  selected_final_rows: Array<{
    fiscal_end_date?: string;
    metric_date: string;
    batch_id?: string;
    rows_in_month?: number;
    soi_count: number | null;
    installs: number | null;
    soi_rate: number | null;
  }>;
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    soi_count: number | null;
    installs: number | null;
    soi_rate: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function computePct(installs: number, soiCount: number): number | null {
  if (installs > 0) return (100 * soiCount) / installs;
  return null;
}

function computeRangeValue(
  rows: Array<{
    installs: number | null;
    soi_count: number | null;
    soi_rate: number | null;
  }>
): string {
  const installs = rows.reduce((sum, row) => sum + (row.installs ?? 0), 0);
  const soiCount = rows.reduce((sum, row) => sum + (row.soi_count ?? 0), 0);

  if (installs > 0) {
    return formatPct(computePct(installs, soiCount));
  }

  const fallbackRates = rows
    .map((row) => row.soi_rate)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (fallbackRates.length > 0) {
    return formatPct(
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length
    );
  }

  return "—";
}

export function buildSoiDrawerModel(args: {
  tile: Tile;
  soiDebug: SoiDebug;
  activeRange: RangeKey;
}) {
  const selectedRows = args.soiDebug?.selected_final_rows ?? [];

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

  const totalInstalls = selectedRows.reduce((sum, row) => sum + (row.installs ?? 0), 0);
  const totalSoi = selectedRows.reduce((sum, row) => sum + (row.soi_count ?? 0), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct =
      row.installs != null && row.installs > 0
        ? formatPct(computePct(row.installs, row.soi_count ?? 0))
        : formatPct(row.soi_rate);

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date,
        rowPct,
        row.soi_count ?? "—",
        row.installs ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalRate, totalSoi || "—", totalInstalls || "—"],
  };

  return {
    summaryRows,
    chart: (
      <FtrSparkline
        values={(args.soiDebug?.trend ?? []).map((t) => ({
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
          { key: "soi_pct", label: "SOI %", align: "right", widthClass: "90px" },
          { key: "soi_count", label: "SOI", align: "right", widthClass: "90px" },
          { key: "installs", label: "Installs", align: "right", widthClass: "90px" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}