import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computePct,
  fetchMetricRawRows,
  getFinalRowsPerMonth,
  groupRowsByTech,
  monthsToTake,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpReworkByTech(args: {
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

    let totalAppts = 0;
    let totalRework = 0;
    const fallbackRates: number[] = [];

    for (const month of selectedMonths) {
      const raw = month.row.raw;

      const totalAppointments = pickNum(raw, [
        "TotalAppts",
        "Total Appts",
        "total_appts",
        "Total Appointments",
        "total_appointments",
      ]);

      const reworkCount = pickNum(raw, [
        "Rework Count",
        "rework_count",
        "ReworkCount",
      ]);

      if (totalAppointments != null && totalAppointments > 0) {
        totalAppts += totalAppointments;
        totalRework += reworkCount ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "Rework Rate%",
        "Rework Rate %",
        "rework_rate",
        "rework_rate_pct",
        "rework",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalAppts > 0) {
      finalValue = computePct(totalAppts, totalRework);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}