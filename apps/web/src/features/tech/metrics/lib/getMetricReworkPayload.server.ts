import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export type MetricsRangeKey = "FM" | "3FM" | "12FM";

type Args = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

type RawRow = {
  metric_date: string;
  fiscal_end_date: string;
  batch_id: string;
  raw: Record<string, unknown>;
};

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function computePct(denominator: number, numerator: number): number | null {
  if (denominator > 0) return (100 * numerator) / denominator;
  return null;
}

function monthsToTake(range: MetricsRangeKey) {
  if (range === "3FM") return 3;
  if (range === "12FM") return 12;
  return 1;
}

function groupByMonth(rows: RawRow[]) {
  const map = new Map<string, RawRow[]>();
  for (const r of rows) {
    const key = r.fiscal_end_date;
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

function getFinalRowPerMonth(rows: RawRow[]) {
  const grouped = groupByMonth(rows);
  const out: Array<{
    fiscal_end_date: string;
    row: RawRow;
    rows_in_month: number;
  }> = [];

  for (const [fiscal_end_date, arr] of grouped) {
    arr.sort((a, b) => {
      const byMetricDate = b.metric_date.localeCompare(a.metric_date);
      if (byMetricDate !== 0) return byMetricDate;
      return b.batch_id.localeCompare(a.batch_id);
    });

    out.push({
      fiscal_end_date,
      row: arr[0],
      rows_in_month: arr.length,
    });
  }

  out.sort((a, b) => b.fiscal_end_date.localeCompare(a.fiscal_end_date));
  return out;
}

function parseRaw(raw: unknown): Record<string, unknown> {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function pickReworkCount(raw: Record<string, unknown>) {
  return pickNum(raw, ["Rework Count", "rework_count", "ReworkCount"]);
}

function pickTotalAppts(raw: Record<string, unknown>) {
  return pickNum(raw, ["TotalAppts", "Total Appts", "total_appts"]);
}

function pickDirectRate(raw: Record<string, unknown>) {
  return pickNum(raw, [
    "Rework Rate%",
    "Rework Rate %",
    "rework_rate",
    "rework_rate_pct",
  ]);
}

function computeRowRework(raw: Record<string, unknown>) {
  const totalAppts = pickTotalAppts(raw);
  const reworkCount = pickReworkCount(raw);

  if (totalAppts != null && totalAppts > 0) {
    return {
      totalAppts,
      reworkCount,
      rate: computePct(totalAppts, reworkCount ?? 0),
      usesFacts: true,
    };
  }

  return {
    totalAppts,
    reworkCount,
    rate: pickDirectRate(raw),
    usesFacts: false,
  };
}

export async function getMetricReworkPayload(args: Args) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) return null;

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("metrics_raw_row")
    .select("metric_date,fiscal_end_date,batch_id,raw")
    .eq("pc_org_id", scope.selected_pc_org_id)
    .eq("tech_id", args.tech_id)
    .order("fiscal_end_date", { ascending: false })
    .order("metric_date", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`getMetricReworkPayload failed: ${error.message}`);
  }

  const rows: RawRow[] = (data ?? []).map((r: any) => ({
    metric_date: String(r.metric_date ?? "").slice(0, 10),
    fiscal_end_date: String(r.fiscal_end_date ?? "").slice(0, 10),
    batch_id: String(r.batch_id ?? ""),
    raw: parseRaw(r.raw),
  }));

  if (!rows.length) return null;

  const finalRowsByMonth = getFinalRowPerMonth(rows);
  const distinctFiscalMonthsFound = finalRowsByMonth.map((x) => x.fiscal_end_date);
  const selectedMonthCount = monthsToTake(args.range);
  const selectedFinalRows = finalRowsByMonth.slice(0, selectedMonthCount);
  const selectedFiscalMonths = new Set(selectedFinalRows.map((x) => x.fiscal_end_date));

  let totalAppts = 0;
  let totalRework = 0;
  const fallbackRates: number[] = [];

  for (const item of selectedFinalRows) {
    const rowData = computeRowRework(item.row.raw);

    if (rowData.usesFacts && rowData.totalAppts != null && rowData.totalAppts > 0) {
      totalAppts += rowData.totalAppts;
      totalRework += rowData.reworkCount ?? 0;
    } else if (rowData.rate != null && Number.isFinite(rowData.rate)) {
      fallbackRates.push(rowData.rate);
    }
  }

  let summaryRate: number | null = null;
  if (totalAppts > 0) {
    summaryRate = computePct(totalAppts, totalRework);
  } else if (fallbackRates.length > 0) {
    summaryRate =
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length;
  }

  const monthFinalMap = new Set(
    selectedFinalRows.map(
      (x) => `${x.row.fiscal_end_date}::${x.row.metric_date}::${x.row.batch_id}`
    )
  );

  const trend = rows
    .filter((r) => selectedFiscalMonths.has(r.fiscal_end_date))
    .map((r) => {
      const rowData = computeRowRework(r.raw);

      return {
        fiscal_end_date: r.fiscal_end_date,
        metric_date: r.metric_date,
        batch_id: r.batch_id,
        rework_count: rowData.reworkCount,
        total_appts: rowData.totalAppts,
        rework_rate: rowData.rate,
        kpi_value: rowData.rate,
        is_month_final: monthFinalMap.has(
          `${r.fiscal_end_date}::${r.metric_date}::${r.batch_id}`
        ),
      };
    })
    .sort((a, b) => {
      const byFiscal = a.fiscal_end_date.localeCompare(b.fiscal_end_date);
      if (byFiscal !== 0) return byFiscal;
      const byMetric = a.metric_date.localeCompare(b.metric_date);
      if (byMetric !== 0) return byMetric;
      return a.batch_id.localeCompare(b.batch_id);
    });

  return {
    debug: {
      requested_range: args.range,
      distinct_fiscal_month_count: distinctFiscalMonthsFound.length,
      distinct_fiscal_months_found: distinctFiscalMonthsFound,
      selected_month_count: selectedFinalRows.length,
      selected_final_rows: selectedFinalRows.map((x) => {
        const rowData = computeRowRework(x.row.raw);

        return {
          fiscal_end_date: x.row.fiscal_end_date,
          metric_date: x.row.metric_date,
          batch_id: x.row.batch_id,
          rows_in_month: x.rows_in_month,
          rework_count: rowData.reworkCount,
          total_appts: rowData.totalAppts,
          rework_rate: rowData.rate,
        };
      }),
      trend,
    },
    summary: {
      rework_rate: summaryRate,
      rework_count: totalRework,
      total_appts: totalAppts,
    },
    trend,
  };
}