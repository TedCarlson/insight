import type { BpViewRosterRow } from "./bpView.types";

type RosterColumn = {
  kpi_key: string;
  label: string;
};

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function jobsForRow(row: BpViewRosterRow) {
  return safeNumber(row.work_mix?.total) ?? 0;
}

function riskForRow(row: BpViewRosterRow) {
  return safeNumber(row.below_target_count) ?? 0;
}

function primaryKpiAggregate(row: BpViewRosterRow, rosterColumns: RosterColumn[]) {
  const primaryKeys = rosterColumns.slice(0, 3).map((col) => col.kpi_key);

  const values = primaryKeys
    .map((kpiKey) => row.metrics.find((metric) => metric.kpi_key === kpiKey))
    .map((metric) => safeNumber(metric?.value))
    .filter((value): value is number => value != null);

  if (!values.length) return -1;

  return values.reduce((sum, value) => sum + value, 0);
}

function fullNameForSort(row: BpViewRosterRow) {
  return String(row.full_name ?? "").trim().toLowerCase();
}

export function sortBpRosterRows(
  rows: BpViewRosterRow[],
  rosterColumns: RosterColumn[]
): BpViewRosterRow[] {
  return [...rows].sort((a, b) => {
    const aJobs = jobsForRow(a);
    const bJobs = jobsForRow(b);

    const aHasJobs = aJobs > 0 ? 1 : 0;
    const bHasJobs = bJobs > 0 ? 1 : 0;

    if (aHasJobs !== bHasJobs) return bHasJobs - aHasJobs;

    const aRisk = riskForRow(a);
    const bRisk = riskForRow(b);

    if (aRisk !== bRisk) return aRisk - bRisk;

    const aPrimary = primaryKpiAggregate(a, rosterColumns);
    const bPrimary = primaryKpiAggregate(b, rosterColumns);

    if (aPrimary !== bPrimary) return bPrimary - aPrimary;

    if (aJobs !== bJobs) return bJobs - aJobs;

    return fullNameForSort(a).localeCompare(fullNameForSort(b));
  });
}