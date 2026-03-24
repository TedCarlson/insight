import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computePct,
  fetchMetricRawRows,
  groupRowsByTech,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpRepeatByTech(args: {
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
    let totalRepeats = 0;
    const fallbackRates: number[] = [];

    for (const row of techRows) {
      const raw = row.raw;

      const jobs = pickNum(raw, [
        "Repeat Eligible Jobs",
        "repeat_eligible_jobs",
        "Repeat Jobs",
        "repeat_jobs",
        "Total Jobs",
        "total_jobs",
      ]);

      const repeats = pickNum(raw, [
        "Repeat Jobs Count",
        "repeat_jobs_count",
        "repeat_count",
        "Repeat Count",
      ]);

      if (jobs != null && jobs > 0) {
        totalJobs += jobs;
        totalRepeats += repeats ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "Repeat Rate%",
        "Repeat Rate %",
        "repeat_rate",
        "repeat",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalJobs > 0) {
      finalValue = computePct(totalJobs, totalRepeats);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}