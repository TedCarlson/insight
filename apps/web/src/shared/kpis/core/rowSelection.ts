import type { MetricsRangeKey, RawMetricRow } from "@/shared/kpis/core/types";

// ---------- helpers ----------

function groupByFiscalMonth(rows: RawMetricRow[]) {
  const map = new Map<string, RawMetricRow[]>();

  for (const r of rows) {
    const key = r.fiscal_end_date;
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }

  return map;
}

function sortRowsForFinalSelection(a: RawMetricRow, b: RawMetricRow) {
  // 1. latest metric date wins
  const byMetricDate = b.metric_date.localeCompare(a.metric_date);
  if (byMetricDate !== 0) return byMetricDate;

  // 2. latest inserted row wins
  const byInserted = b.inserted_at.localeCompare(a.inserted_at);
  if (byInserted !== 0) return byInserted;

  // 3. final tiebreak
  return b.batch_id.localeCompare(a.batch_id);
}

// ---------- core selection ----------

export function getFinalRowPerFiscalMonth(rows: RawMetricRow[]) {
  const grouped = groupByFiscalMonth(rows);

  const result: Array<{
    fiscal_end_date: string;
    row: RawMetricRow;
    rows_in_month: number;
  }> = [];

  for (const [fiscal_end_date, arr] of grouped) {
    arr.sort(sortRowsForFinalSelection);

    result.push({
      fiscal_end_date,
      row: arr[0],
      rows_in_month: arr.length,
    });
  }

  // newest fiscal month first
  result.sort((a, b) =>
    b.fiscal_end_date.localeCompare(a.fiscal_end_date)
  );

  return result;
}

// ---------- range selection ----------

function monthsToTake(range: MetricsRangeKey) {
  switch (range) {
    case "12FM":
      return 12;
    case "3FM":
      return 3;
    case "PREVIOUS":
      return 2;
    case "FM":
    default:
      return 1;
  }
}

export function selectRowsForRange(
  finalRows: ReturnType<typeof getFinalRowPerFiscalMonth>,
  range: MetricsRangeKey
) {
  if (range === "PREVIOUS") {
    return finalRows.slice(1, 2);
  }

  const take = monthsToTake(range);
  return finalRows.slice(0, take);
}

// ---------- convenience ----------

export function resolveFiscalSelection(
  rows: RawMetricRow[],
  range: MetricsRangeKey
) {
  const finalRows = getFinalRowPerFiscalMonth(rows);
  const selected = selectRowsForRange(finalRows, range);

  return {
    finalRowsByMonth: finalRows,
    selectedFinalRows: selected,
    selectedFiscalMonths: new Set(
      selected.map((x) => x.fiscal_end_date)
    ),
  };
}