import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

type ToolUsageTrendRow = {
  kpi_value?: number | null;
  is_month_final?: boolean | null;
};

type ToolUsageSelectedRow = {
  fiscal_end_date?: string | null;
  metric_date?: string | null;
  batch_id?: string | null;
  tool_usage_jobs?: number | null;
  jobs_with_required_tool?: number | null;
  required_tool_jobs?: number | null;
  compliant_jobs?: number | null;
  tool_usage_pass_jobs?: number | null;
  tool_usage_fail_jobs?: number | null;
  missing_tool_jobs?: number | null;
  noncompliant_jobs?: number | null;
  tu_eligible_jobs?: number | null;
  tu_compliant_jobs?: number | null;
  tool_usage_rate?: number | null;
};

type ToolUsageDebug = {
  distinct_fiscal_month_count?: number | null;
  selected_month_count?: number | null;
  selected_final_rows?: ToolUsageSelectedRow[] | null;
  trend?: ToolUsageTrendRow[] | null;
} | null;

function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveEligible(row: ToolUsageSelectedRow): number {
  return (
    asNumber(row.tu_eligible_jobs) ||
    asNumber(row.required_tool_jobs) ||
    asNumber(row.tool_usage_jobs)
  );
}

function resolveCompliant(row: ToolUsageSelectedRow): number {
  return (
    asNumber(row.tu_compliant_jobs) ||
    asNumber(row.jobs_with_required_tool) ||
    asNumber(row.compliant_jobs) ||
    asNumber(row.tool_usage_pass_jobs)
  );
}

function computePct(eligible: number, compliant: number, fallback?: number | null): number | null {
  if (eligible > 0) return (100 * compliant) / eligible;
  return fallback ?? null;
}

function computeRangeValue(rows: ToolUsageSelectedRow[]): string {
  const eligible = rows.reduce((sum, row) => sum + resolveEligible(row), 0);
  const compliant = rows.reduce((sum, row) => sum + resolveCompliant(row), 0);
  return formatPct(computePct(eligible, compliant, null));
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionToolUsage(args: {
  payload: unknown;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const debug =
    (args.payload as { debug?: ToolUsageDebug } | null)?.debug ?? null;
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

  const totalEligible = selectedRows.reduce((sum, row) => sum + resolveEligible(row), 0);
  const totalCompliant = selectedRows.reduce((sum, row) => sum + resolveCompliant(row), 0);
  const totalRate = computeRangeValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const eligible = resolveEligible(row);
    const compliant = resolveCompliant(row);
    const pct = formatPct(computePct(eligible, compliant, row.tool_usage_rate ?? null));

    return {
      key: `${row.fiscal_end_date ?? "na"}-${row.metric_date ?? "na"}-${row.batch_id ?? "na"}`,
      cells: [row.metric_date ?? "—", pct, eligible || "—", compliant || "—"],
    };
  });

  return {
    header: {
      title: "Tool Usage %",
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
        { key: "tool_usage_pct", label: "Tool Usage %", align: "right", widthClass: "90px" },
        { key: "eligible", label: "Eligible", align: "right", widthClass: "90px" },
        { key: "compliant", label: "Compliant", align: "right", widthClass: "90px" },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: ["TOTAL", totalRate, totalEligible || "—", totalCompliant || "—"],
      },
    },
  };
}