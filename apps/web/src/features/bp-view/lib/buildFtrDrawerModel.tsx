import KpiTrendChart from "@/features/metrics/scorecard/components/KpiTrendChart";
import MetricPeriodDetailTable from "../components/MetricPeriodDetailTable";
import type { BpRangeKey, BpViewRosterMetricCell } from "./bpView.types";

type FtrPayload = {
  debug?: {
    selected_final_rows?: Array<{
      fiscal_end_date: string;
      metric_date: string;
      batch_id: string;
      rows_in_month: number;
      total_ftr_contact_jobs: number | null;
      ftr_fail_jobs: number | null;
    }>;
  };
  summary?: {
    ftr_rate: number | null;
    total_contact_jobs: number;
    total_fail_jobs: number;
  };
} | null;

function fmtPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function computeFtrPct(jobs: number, fails: number): number | null {
  if (jobs > 0) return 100 * (1 - fails / jobs);
  if (fails > 0) return 0;
  return null;
}

function buildRangeFtrValue(
  rows: Array<{
    total_ftr_contact_jobs: number | null;
    ftr_fail_jobs: number | null;
  }>
) {
  const jobs = rows.reduce((sum, row) => sum + (row.total_ftr_contact_jobs ?? 0), 0);
  const fails = rows.reduce((sum, row) => sum + (row.ftr_fail_jobs ?? 0), 0);
  return fmtPct(computeFtrPct(jobs, fails));
}

function bandLabel(bandKey: string) {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function bandAccent(bandKey: string) {
  if (bandKey === "EXCEEDS") return "var(--to-success)";
  if (bandKey === "MEETS") return "var(--to-primary)";
  if (bandKey === "NEEDS_IMPROVEMENT") return "var(--to-warning)";
  if (bandKey === "MISSES") return "var(--to-danger)";
  return "var(--to-border)";
}

export function buildFtrDrawerModel(args: {
  metric: BpViewRosterMetricCell;
  personId: string;
  activeRange: BpRangeKey;
  ftrPayload: FtrPayload;
}) {
  const selectedRows = args.ftrPayload?.debug?.selected_final_rows ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows;

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Current FM", value: buildRangeFtrValue(currentRows) },
  ];

  if (args.activeRange !== "FM") {
    summaryRows.push({ label: "Last 3 FM", value: buildRangeFtrValue(last3Rows) });
  }

  if (args.activeRange === "12FM") {
    summaryRows.push({ label: "Last 12 FM", value: buildRangeFtrValue(last12Rows) });
  }

  const totalJobs = selectedRows.reduce(
    (sum, row) => sum + (row.total_ftr_contact_jobs ?? 0),
    0
  );
  const totalFails = selectedRows.reduce(
    (sum, row) => sum + (row.ftr_fail_jobs ?? 0),
    0
  );
  const totalFtr = buildRangeFtrValue(selectedRows);

  const periodRows = selectedRows.map((row) => {
    const rowPct = fmtPct(
      computeFtrPct(row.total_ftr_contact_jobs ?? 0, row.ftr_fail_jobs ?? 0)
    );

    return {
      key: `${row.fiscal_end_date}-${row.metric_date}-${row.batch_id}`,
      cells: [
        row.metric_date,
        rowPct,
        row.total_ftr_contact_jobs ?? "—",
        row.ftr_fail_jobs ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: ["TOTAL", totalFtr, totalJobs || "—", totalFails || "—"],
  };

  return {
    title: args.metric.label,
    valueDisplay:
      args.ftrPayload?.summary?.ftr_rate != null
        ? fmtPct(args.ftrPayload.summary.ftr_rate)
        : args.metric.value_display,
    bandLabel: bandLabel(args.metric.band_key),
    accentColor: bandAccent(args.metric.band_key),
    summaryRows,
    extraSections: [] as React.ReactNode[],
    chart: (
      <KpiTrendChart
        kpiKey={args.metric.kpi_key}
        fiscalWindow={args.activeRange}
        personId={args.personId}
      />
    ),
    periodDetail: (
      <MetricPeriodDetailTable
        title="Period Detail"
        columns={[
          { key: "metric_date", label: "Metric Date" },
          { key: "ftr_pct", label: "FTR %", align: "right", widthClass: "w-[90px]" },
          { key: "jobs", label: "Jobs", align: "right", widthClass: "w-[90px]" },
          { key: "fails", label: "Fails", align: "right", widthClass: "w-[90px]" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}