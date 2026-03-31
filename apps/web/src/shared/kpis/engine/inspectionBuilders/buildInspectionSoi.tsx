import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

type SoiTrendRow = {
  kpi_value?: number | null;
  is_month_final?: boolean | null;
};

type SoiSelectedRow = {
  fiscal_end_date?: string | null;
  metric_date?: string | null;
  batch_id?: string | null;
  soi_count?: number | null;
  installs?: number | null;
  soi_rate?: number | null;
};

type SoiDebug = {
  distinct_fiscal_month_count?: number | null;
  selected_month_count?: number | null;
  selected_final_rows?: SoiSelectedRow[] | null;
  trend?: SoiTrendRow[] | null;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function computeRate(row: SoiSelectedRow): number | null {
  const soi = asNumber(row.soi_count);
  const installs = asNumber(row.installs);
  if (installs > 0) return (100 * soi) / installs;
  return row.soi_rate ?? null;
}

function computeRangeValue(rows: SoiSelectedRow[]): string {
  const soi = rows.reduce((sum, row) => sum + asNumber(row.soi_count), 0);
  const installs = rows.reduce((sum, row) => sum + asNumber(row.installs), 0);
  if (installs > 0) return formatPct((100 * soi) / installs);
  return "—";
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionSoi(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug = (args.payload as { debug?: SoiDebug } | null)?.debug ?? null;
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

  const totalSoi = selectedRows.reduce((sum, row) => sum + asNumber(row.soi_count), 0);
  const totalInstalls = selectedRows.reduce((sum, row) => sum + asNumber(row.installs), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => ({
    key: `${row.fiscal_end_date ?? "na"}-${row.metric_date ?? "na"}-${row.batch_id ?? "na"}`,
    cells: [
      row.metric_date ?? "—",
      formatPct(computeRate(row)),
      row.soi_count ?? "—",
      row.installs ?? "—",
    ],
  }));

  return {
    header: {
      title: "SOI %",
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
        { key: "soi_pct", label: "SOI %", align: "right", widthClass: "90px" },
        { key: "soi", label: "SOI", align: "right", widthClass: "90px" },
        { key: "installs", label: "Installs", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalRate, totalSoi || "—", totalInstalls || "—"],
      },
    },
  };
}