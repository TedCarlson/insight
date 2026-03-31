import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

type Contact48HrTrendRow = {
  kpi_value?: number | null;
  is_month_final?: boolean | null;
};

type Contact48HrSelectedRow = {
  fiscal_end_date?: string | null;
  metric_date?: string | null;
  batch_id?: string | null;
  contact_orders_48hr?: number | null;
  eligible_jobs_48hr?: number | null;
  callback_rate_48hr?: number | null;
};

type Contact48HrDebug = {
  distinct_fiscal_month_count?: number | null;
  selected_month_count?: number | null;
  selected_final_rows?: Contact48HrSelectedRow[] | null;
  trend?: Contact48HrTrendRow[] | null;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function aggregateRatio<T>(args: {
  rows: T[];
  getNumerator: (row: T) => number;
  getDenominator: (row: T) => number;
}) {
  const numerator = args.rows.reduce((sum, row) => sum + args.getNumerator(row), 0);
  const denominator = args.rows.reduce((sum, row) => sum + args.getDenominator(row), 0);

  return {
    numerator,
    denominator,
    value: denominator > 0 ? (100 * numerator) / denominator : null,
  };
}

function computeRangeValue(rows: Contact48HrSelectedRow[]): string {
  const agg = aggregateRatio({
    rows,
    getNumerator: (row) => asNumber(row.contact_orders_48hr),
    getDenominator: (row) => asNumber(row.eligible_jobs_48hr),
  });

  if (agg.denominator > 0) return formatPct(agg.value);
  if (rows.length === 1) return formatPct(rows[0]?.callback_rate_48hr ?? null);
  return "—";
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspection48Hr(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug =
    (args.payload as { debug?: Contact48HrDebug } | null)?.debug ?? null;
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

  const totalAgg = aggregateRatio({
    rows: selectedRows,
    getNumerator: (row) => asNumber(row.contact_orders_48hr),
    getDenominator: (row) => asNumber(row.eligible_jobs_48hr),
  });

  const totalEligible = totalAgg.denominator;
  const totalOrders = totalAgg.numerator;
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowAgg = aggregateRatio({
      rows: [row],
      getNumerator: (r) => asNumber(r.contact_orders_48hr),
      getDenominator: (r) => asNumber(r.eligible_jobs_48hr),
    });

    const rowPct =
      rowAgg.denominator > 0
        ? formatPct(rowAgg.value)
        : formatPct(row.callback_rate_48hr ?? null);

    return {
      key: `${row.metric_date ?? "na"}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date ?? "—",
        rowPct,
        row.contact_orders_48hr ?? "—",
        row.eligible_jobs_48hr ?? "—",
      ],
    };
  });

  return {
    header: {
      title: "48Hr %",
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
        { key: "callback_pct", label: "48Hr %", align: "right", widthClass: "90px" },
        { key: "orders", label: "Orders", align: "right", widthClass: "90px" },
        { key: "eligible", label: "Eligible", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalRate, totalOrders || "—", totalEligible || "—"],
      },
    },
  };
}