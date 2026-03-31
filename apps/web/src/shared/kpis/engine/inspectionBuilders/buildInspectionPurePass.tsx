import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

type PurePassTrendRow = {
  kpi_value?: number | null;
  is_month_final?: boolean | null;
};

type PurePassSelectedRow = {
  fiscal_end_date?: string | null;
  metric_date?: string | null;
  batch_id?: string | null;
  pht_jobs?: number | null;
  pure_pass?: number | null;
  pure_pass_rate?: number | null;
  pure_pass_jobs?: number | null;
  pure_pass_pass_jobs?: number | null;
};

type PurePassDebug = {
  distinct_fiscal_month_count?: number | null;
  selected_month_count?: number | null;
  selected_final_rows?: PurePassSelectedRow[] | null;
  trend?: PurePassTrendRow[] | null;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveJobs(row: PurePassSelectedRow): number {
  return asNumber(row.pht_jobs) || asNumber(row.pure_pass_jobs);
}

function resolvePurePass(row: PurePassSelectedRow): number {
  return asNumber(row.pure_pass) || asNumber(row.pure_pass_pass_jobs);
}

function computePct(jobs: number, purePass: number, fallback?: number | null): number | null {
  if (jobs > 0) return (100 * purePass) / jobs;
  return fallback ?? null;
}

function computeRangeValue(rows: PurePassSelectedRow[]): string {
  const jobs = rows.reduce((sum, row) => sum + resolveJobs(row), 0);
  const purePass = rows.reduce((sum, row) => sum + resolvePurePass(row), 0);
  return formatPct(computePct(jobs, purePass, null));
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionPurePass(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug =
    (args.payload as { debug?: PurePassDebug } | null)?.debug ?? null;
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

  const totalJobs = selectedRows.reduce((sum, row) => sum + resolveJobs(row), 0);
  const totalPurePass = selectedRows.reduce((sum, row) => sum + resolvePurePass(row), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const jobs = resolveJobs(row);
    const purePass = resolvePurePass(row);
    const pct = formatPct(computePct(jobs, purePass, row.pure_pass_rate ?? null));

    return {
      key: `${row.fiscal_end_date ?? "na"}-${row.metric_date ?? "na"}-${row.batch_id ?? "na"}`,
      cells: [row.metric_date ?? "—", pct, jobs || "—", purePass || "—"],
    };
  });

  return {
    header: {
      title: "Pure Pass %",
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
          t.kpi_value != null && t.kpi_value >= 95
            ? "#22c55e"
            : t.kpi_value != null && t.kpi_value >= 90
              ? "#eab308"
              : "#ef4444",
      })),
    },
    periodDetail: {
      title: "Period Detail",
      columns: [
        { key: "metric_date", label: "Metric Date" },
        { key: "pure_pass_pct", label: "Pure Pass %", align: "right", widthClass: "90px" },
        { key: "jobs", label: "PHT Jobs", align: "right", widthClass: "90px" },
        { key: "pure_pass", label: "Pure Pass", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalRate, totalJobs || "—", totalPurePass || "—"],
      },
    },
  };
}