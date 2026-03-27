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

function pickRepeatCount(raw: Record<string, unknown>) {
  return pickNum(raw, [
    "Repeat Count",
    "repeat_count",
    "RepeatCount",
  ]);
}

function pickTcs(raw: Record<string, unknown>) {
  return pickNum(raw, [
    "TCs",
    "tcs",
    "tc_count",
  ]);
}

function pickDirectRate(raw: Record<string, unknown>) {
  return pickNum(raw, [
    "Repeat Rate%",
    "Repeat Rate %",
    "repeat_rate",
    "repeat_rate_pct",
  ]);
}

function computeRowRepeat(raw: Record<string, unknown>) {
  const tcs = pickTcs(raw);
  const repeats = pickRepeatCount(raw);

  if (tcs != null && tcs > 0) {
    return {
      tcs,
      repeats,
      rate: computePct(tcs, repeats ?? 0),
      usesFacts: true,
    };
  }

  return {
    tcs,
    repeats,
    rate: pickDirectRate(raw),
    usesFacts: false,
  };
}

export async function getMetricRepeatPayload(args: Args) {
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
    throw new Error(`getMetricRepeatPayload failed: ${error.message}`);
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

  let totalTcs = 0;
  let totalRepeats = 0;
  const fallbackRates: number[] = [];

  for (const item of selectedFinalRows) {
    const rowData = computeRowRepeat(item.row.raw);

    if (rowData.usesFacts && rowData.tcs != null && rowData.tcs > 0) {
      totalTcs += rowData.tcs;
      totalRepeats += rowData.repeats ?? 0;
    } else if (rowData.rate != null && Number.isFinite(rowData.rate)) {
      fallbackRates.push(rowData.rate);
    }
  }

  let summaryRate: number | null = null;
  if (totalTcs > 0) {
    summaryRate = computePct(totalTcs, totalRepeats);
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
      const rowData = computeRowRepeat(r.raw);

      return {
        fiscal_end_date: r.fiscal_end_date,
        metric_date: r.metric_date,
        batch_id: r.batch_id,
        inserted_at: r.inserted_at,
        repeat_count: rowData.repeats,
        tc_count: rowData.tcs,
        repeat_rate: rowData.rate,
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
        const rowData = computeRowRepeat(x.row.raw);

        return {
          fiscal_end_date: x.row.fiscal_end_date,
          metric_date: x.row.metric_date,
          batch_id: x.row.batch_id,
          inserted_at: x.row.inserted_at,
          rows_in_month: x.rows_in_month,
          repeat_count: rowData.repeats,
          tc_count: rowData.tcs,
          repeat_rate: rowData.rate,
        };
      }),
      trend,
    },
    summary: {
      repeat_rate: summaryRate,
      repeat_count: totalRepeats,
      tc_count: totalTcs,
    },
    trend,
  };
}