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

function computeTnpsScore(
  surveys: number,
  promoters: number,
  detractors: number
): number | null {
  if (surveys > 0) return (100 * (promoters - detractors)) / surveys;
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

export async function getMetricTnpsPayload(args: Args) {
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
    throw new Error(`getMetricTnpsPayload failed: ${error.message}`);
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

  const distinctFiscalMonthsFound = finalRowsByMonth.map((x) => x.fiscal_end_date);

  const summaryRows =
    args.range === "FM" || args.range === "PREVIOUS"
      ? selectedFinalRows.length
        ? [selectedFinalRows[0].row]
        : []
      : selectedFinalRows.map((x) => x.row);

  let totalSurveys = 0;
  let totalPromoters = 0;
  let totalDetractors = 0;

  for (const row of summaryRows) {
    const surveys = pickNum(row.raw, [
      "tNPS Surveys",
      "tnps_surveys",
      "tNPS_Surveys",
      "Surveys",
    ]);

    const promoters = pickNum(row.raw, ["Promoters", "tnps_promoters"]);

    const detractors = pickNum(row.raw, ["Detractors", "tnps_detractors"]);

    if (surveys != null && surveys > 0) {
      totalSurveys += surveys;
      totalPromoters += promoters ?? 0;
      totalDetractors += detractors ?? 0;
    }
  }

  const summaryTnps =
    totalSurveys > 0
      ? computeTnpsScore(totalSurveys, totalPromoters, totalDetractors)
      : null;

  const monthFinalMap = new Set(
    selectedFinalRows.map(
      (x) =>
        `${x.row.fiscal_end_date}::${x.row.metric_date}::${x.row.inserted_at}::${x.row.batch_id}`
    )
  );

  const trend = rows
    .filter((r) => selectedFiscalMonths.has(r.fiscal_end_date))
    .map((r) => {
      const surveys = pickNum(r.raw, [
        "tNPS Surveys",
        "tnps_surveys",
        "tNPS_Surveys",
        "Surveys",
      ]);

      const promoters = pickNum(r.raw, ["Promoters", "tnps_promoters"]);

      const detractors = pickNum(r.raw, ["Detractors", "tnps_detractors"]);

      const kpiValue =
        surveys != null && surveys > 0
          ? computeTnpsScore(surveys, promoters ?? 0, detractors ?? 0)
          : null;

      return {
        fiscal_end_date: r.fiscal_end_date,
        metric_date: r.metric_date,
        batch_id: r.batch_id,
        inserted_at: r.inserted_at,
        tnps_surveys: surveys,
        tnps_promoters: promoters,
        tnps_detractors: detractors,
        kpi_value: kpiValue,
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
      distinct_fiscal_month_count: distinctFiscalMonthsFound.length,
      distinct_fiscal_months_found: distinctFiscalMonthsFound,
      selected_month_count: selectedFinalRows.length,
      selected_final_rows: selectedFinalRows.map((x) => {
        const surveys = pickNum(x.row.raw, [
          "tNPS Surveys",
          "tnps_surveys",
          "tNPS_Surveys",
          "Surveys",
        ]);

        const promoters = pickNum(x.row.raw, ["Promoters", "tnps_promoters"]);

        const detractors = pickNum(x.row.raw, ["Detractors", "tnps_detractors"]);

        return {
          fiscal_end_date: x.row.fiscal_end_date,
          metric_date: x.row.metric_date,
          batch_id: x.row.batch_id,
          inserted_at: x.row.inserted_at,
          rows_in_month: x.rows_in_month,
          tnps_surveys: surveys,
          tnps_promoters: promoters,
          tnps_detractors: detractors,
        };
      }),
      trend,
    },
    summary: {
      tnps_score: summaryTnps,
      tnps_surveys: totalSurveys,
      tnps_promoters: totalPromoters,
      tnps_detractors: totalDetractors,
    },
    trend,
  };
}