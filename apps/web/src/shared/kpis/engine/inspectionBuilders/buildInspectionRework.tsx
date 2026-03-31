import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

type ReworkTrendRow = {
  kpi_value?: number | null;
  is_month_final?: boolean | null;
};

type ReworkSelectedRow = {
  fiscal_end_date?: string | null;
  metric_date?: string | null;
  batch_id?: string | null;
  rework_count?: number | null;
  total_appts?: number | null;
  rework_rate?: number | null;
};

type ReworkDebug = {
  distinct_fiscal_month_count?: number | null;
  selected_month_count?: number | null;
  selected_final_rows?: ReworkSelectedRow[] | null;
  trend?: ReworkTrendRow[] | null;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function computeRate(row: ReworkSelectedRow): number | null {
  const rework = asNumber(row.rework_count);
  const appts = asNumber(row.total_appts);
  if (appts > 0) return (100 * rework) / appts;
  return row.rework_rate ?? null;
}

function computeRangeValue(rows: ReworkSelectedRow[]): string {
  const rework = rows.reduce((sum, row) => sum + asNumber(row.rework_count), 0);
  const appts = rows.reduce((sum, row) => sum + asNumber(row.total_appts), 0);
  if (appts > 0) return formatPct((100 * rework) / appts);
  return "—";
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionRework(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug =
    (args.payload as { debug?: ReworkDebug } | null)?.debug ?? null;
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

  const totalRework = selectedRows.reduce((sum, row) => sum + asNumber(row.rework_count), 0);
  const totalAppts = selectedRows.reduce((sum, row) => sum + asNumber(row.total_appts), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => ({
    key: `${row.fiscal_end_date ?? "na"}-${row.metric_date ?? "na"}-${row.batch_id ?? "na"}`,
    cells: [
      row.metric_date ?? "—",
      formatPct(computeRate(row)),
      row.rework_count ?? "—",
      row.total_appts ?? "—",
    ],
  }));

  return {
    header: {
      title: "Rework %",
      valueDisplay: headlineValue,
      rangeLabel: mapRangeLabel(args.activeRange),
    },
    trend: {
      title: "Trend",
      badgeValue: totalRate,
      currentValue: totalRate,
      updatesCount: trend.length,
      monthsCount: debug?.selected_month_count ?? debug?.distinct_fiscal_month_count ?? null,
      rangeLabel: mapRangeLabel(args.activeRange),
      points: trend.map((t) => ({
        kpi_value: t.kpi_value ?? null,
        is_month_final: !!t.is_month_final,
        band_color:
          t.kpi_value != null && t.kpi_value <= 5
            ? "#22c55e"
            : t.kpi_value != null && t.kpi_value <= 8
              ? "#eab308"
              : "#ef4444",
      })),
    },
    periodDetail: {
      title: "Period Detail",
      columns: [
        { key: "metric_date", label: "Metric Date" },
        { key: "rework_pct", label: "Rework %", align: "right", widthClass: "90px" },
        { key: "rework", label: "Rework", align: "right", widthClass: "90px" },
        { key: "appts", label: "Appts", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalRate, totalRework || "—", totalAppts || "—"],
      },
    },
  };
}