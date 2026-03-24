import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  fetchMetricRawRows,
  groupRowsByTech,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpFtrByTech(args: {
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

    let totalContactJobs = 0;
    let totalFailJobs = 0;
    const fallbackRates: number[] = [];

    for (const row of techRows) {
      const raw = row.raw;

      const contactJobs = pickNum(raw, [
        "Total FTR/Contact Jobs",
        "total_ftr_contact_jobs",
        "ftr_contact_jobs",
      ]);

      const failJobs = pickNum(raw, [
        "FTRFailJobs",
        "ftr_fail_jobs",
        "FTR Fail Jobs",
      ]);

      if (contactJobs != null && contactJobs > 0) {
        totalContactJobs += contactJobs;
        totalFailJobs += failJobs ?? 0;
        continue;
      }

      if (failJobs != null && failJobs > 0) {
        totalFailJobs += failJobs;
        fallbackRates.push(0);
        continue;
      }

      const fallback = pickNum(raw, [
        "ftr_rate",
        "FTR Rate",
        "FTR %",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalContactJobs > 0) {
      finalValue = 100 * (1 - totalFailJobs / totalContactJobs);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}