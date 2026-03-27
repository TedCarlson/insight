import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { resolveFiscalSelection } from "@/shared/kpis/core/rowSelection";

import type { MetricsRangeKey, RawMetricRow } from "@/shared/kpis/core/types";

type Args = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
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

function pickMetCount(raw: Record<string, unknown>) {
  return pickNum(raw, ["TotalMetAppts", "Total Met Appts", "total_met_appts"]);
}

function pickTotalAppts(raw: Record<string, unknown>) {
  return pickNum(raw, ["TotalAppts", "Total Appts", "total_appts"]);
}

function pickDirectRate(raw: Record<string, unknown>) {
  return pickNum(raw, ["MetRate", "Met Rate", "met_rate", "met_rate_pct"]);
}

function computeRowMet(raw: Record<string, unknown>) {
  const totalAppts = pickTotalAppts(raw);
  const metCount = pickMetCount(raw);

  if (totalAppts != null && totalAppts > 0) {
    return {
      totalAppts,
      metCount,
      rate: computePct(totalAppts, metCount ?? 0),
      usesFacts: true,
    };
  }

  return {
    totalAppts,
    metCount,
    rate: pickDirectRate(raw),
    usesFacts: false,
  };
}

export async function getMetricMetPayload(args: Args) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) return null;

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("metrics_raw_row")
    .select("metric_date,fiscal_end_date,batch_id,inserted_at,raw")
    .eq("pc_org_id", scope.selected_pc_org_id)
    .eq("tech_id", args.tech_id)
    .order("fiscal_end_date", { ascending: false })
    .order("metric_date", { ascending: false })
    .order("inserted_at", { ascending: false })
    .order("batch_id", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`getMetricMetPayload failed: ${error.message}`);
  }

  const rows: RawMetricRow[] = (data ?? []).map((r: any) => ({
    metric_date: String(r.metric_date ?? "").slice(0, 10),
    fiscal_end_date: String(r.fiscal_end_date ?? "").slice(0, 10),
    batch_id: String(r.batch_id ?? ""),
    inserted_at: String(r.inserted_at ?? ""),
    raw: parseRaw(r.raw),
  }));

  if (!rows.length) return null;

  const {
    finalRowsByMonth,
    selectedFinalRows,
    selectedFiscalMonths,
  } = resolveFiscalSelection(rows, args.range);

  let totalAppts = 0;
  let totalMet = 0;
  const fallbackRates: number[] = [];

  for (const item of selectedFinalRows) {
    const rowData = computeRowMet(item.row.raw);

    if (rowData.usesFacts && rowData.totalAppts != null && rowData.totalAppts > 0) {
      totalAppts += rowData.totalAppts;
      totalMet += rowData.metCount ?? 0;
    } else if (rowData.rate != null && Number.isFinite(rowData.rate)) {
      fallbackRates.push(rowData.rate);
    }
  }

  let summaryRate: number | null = null;
  if (totalAppts > 0) {
    summaryRate = computePct(totalAppts, totalMet);
  } else if (fallbackRates.length > 0) {
    summaryRate =
      fallbackRates.reduce((sum, value) => sum + value, 0) / fallbackRates.length;
  }

  const monthFinalMap = new Set(
    selectedFinalRows.map(
      (x) =>
        `${x.row.fiscal_end_date}::${x.row.metric_date}::${x.row.inserted_at}::${x.row.batch_id}`
    )
  );

  const trend = rows
    .filter((r) => selectedFiscalMonths.has(r.fiscal_end_date))
    .map((r) => {
      const rowData = computeRowMet(r.raw);

      return {
        fiscal_end_date: r.fiscal_end_date,
        metric_date: r.metric_date,
        batch_id: r.batch_id,
        inserted_at: r.inserted_at,
        met_count: rowData.metCount,
        total_appts: rowData.totalAppts,
        met_rate: rowData.rate,
        kpi_value: rowData.rate,
        is_month_final: monthFinalMap.has(
          `${r.fiscal_end_date}::${r.metric_date}::${r.inserted_at}::${r.batch_id}`
        ),
      };
    })
    .sort((a, b) => {
      const byFiscal = a.fiscal_end_date.localeCompare(b.fiscal_end_date);
      if (byFiscal !== 0) return byFiscal;

      const byMetric = a.metric_date.localeCompare(b.metric_date);
      if (byMetric !== 0) return byMetric;

      const byInsertedAt = a.inserted_at.localeCompare(b.inserted_at);
      if (byInsertedAt !== 0) return byInsertedAt;

      return a.batch_id.localeCompare(b.batch_id);
    });

  return {
    debug: {
      requested_range: args.range,
      distinct_fiscal_month_count: finalRowsByMonth.length,
      distinct_fiscal_months_found: finalRowsByMonth.map((x) => x.fiscal_end_date),
      selected_month_count: selectedFinalRows.length,
      selected_final_rows: selectedFinalRows.map((x) => {
        const rowData = computeRowMet(x.row.raw);

        return {
          fiscal_end_date: x.row.fiscal_end_date,
          metric_date: x.row.metric_date,
          batch_id: x.row.batch_id,
          inserted_at: x.row.inserted_at,
          rows_in_month: x.rows_in_month,
          met_count: rowData.metCount,
          total_appts: rowData.totalAppts,
          met_rate: rowData.rate,
        };
      }),
      trend,
    },
    summary: {
      met_rate: summaryRate,
      met_count: totalMet,
      total_appts: totalAppts,
    },
    trend,
  };
}