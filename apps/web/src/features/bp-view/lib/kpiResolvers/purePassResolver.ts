import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computePct,
  fetchMetricRawRows,
  groupRowsByTech,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpPurePassByTech(args: {
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

    let totalJobs = 0;
    let totalPurePass = 0;
    const fallbackRates: number[] = [];

    for (const row of techRows) {
      const raw = row.raw;

      const jobs = pickNum(raw, [
        "PHT Jobs",
        "pht_jobs",
        "PHT_Jobs",
      ]);

      const purePass = pickNum(raw, [
        "PHT Pure Pass",
        "pht_pure_pass",
        "PHT_Pure_Pass",
      ]);

      if (jobs != null && jobs > 0) {
        totalJobs += jobs;
        totalPurePass += purePass ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "PHT Pure Pass%",
        "PHT Pure Pass %",
        "pht_pure_pass_pct",
        "pure_pass_rate",
        "pure_pass",
        "pht_pure_pass_rate",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalJobs > 0) {
      finalValue = computePct(totalJobs, totalPurePass);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}