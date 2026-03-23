import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computeTnpsScore,
  fetchMetricRawRows,
  getFinalRowsPerMonth,
  groupRowsByTech,
  monthsToTake,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpTnpsByTech(args: {
  admin?: ReturnType<typeof supabaseAdmin>;
  techIds: string[];
  pcOrgIds: string[];
  range: RangeKey;
}): Promise<Map<string, number | null>> {
  const admin = args.admin ?? supabaseAdmin();
  const { techIds, pcOrgIds, range } = args;

  const result = new Map<string, number | null>();

  if (!techIds.length || !pcOrgIds.length) {
    return result;
  }

  const rows = await fetchMetricRawRows({
    admin,
    techIds,
    pcOrgIds,
  });

  const rowsByTech = groupRowsByTech(rows);
  const monthLimit = monthsToTake(range);

  for (const techId of techIds) {
    const techRows = rowsByTech.get(techId) ?? [];
    const selectedMonths = getFinalRowsPerMonth(techRows).slice(0, monthLimit);

    let totalSurveys = 0;
    let totalPromoters = 0;
    let totalDetractors = 0;
    const fallbackRates: number[] = [];

    for (const month of selectedMonths) {
      const raw = month.row.raw;

      const surveys = pickNum(raw, [
        "tNPS Surveys",
        "tnps_surveys",
        "tNPS_Surveys",
        "Surveys",
      ]);

      const promoters = pickNum(raw, [
        "Promoters",
        "tnps_promoters",
      ]);

      const detractors = pickNum(raw, [
        "Detractors",
        "tnps_detractors",
      ]);

      if (surveys != null && surveys > 0) {
        totalSurveys += surveys;
        totalPromoters += promoters ?? 0;
        totalDetractors += detractors ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "tnps",
        "tnps_score",
        "tNPS",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalSurveys > 0) {
      finalValue = computeTnpsScore(
        totalSurveys,
        totalPromoters,
        totalDetractors
      );
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}