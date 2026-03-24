import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computeTnpsScore,
  fetchMetricRawRows,
  groupRowsByTech,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpTnpsByTech(args: {
  admin?: ReturnType<typeof supabaseAdmin>;
  techIds: string[];
  pcOrgIds: string[];
  range: RangeKey;
  fiscalEndDates?: string[];
}): Promise<Map<string, number | null>> {
  const admin = args.admin ?? supabaseAdmin();
  const { techIds, pcOrgIds, fiscalEndDates } = args;

  const result = new Map<string, number | null>();

  if (!techIds.length || !pcOrgIds.length) {
    return result;
  }

  const rows = await fetchMetricRawRows({
    admin,
    techIds,
    pcOrgIds,
    fiscalEndDates,
  });

  const rowsByTech = groupRowsByTech(rows);

  for (const techId of techIds) {
    const techRows = rowsByTech.get(techId) ?? [];

    let totalSurveys = 0;
    let totalPromoters = 0;
    let totalDetractors = 0;
    const fallbackRates: number[] = [];

    for (const row of techRows) {
      const raw = row.raw;

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