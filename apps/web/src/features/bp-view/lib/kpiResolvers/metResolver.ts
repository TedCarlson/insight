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

export async function resolveBpMetByTech(args: {
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
    let totalMet = 0;
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

      const metCount = pickNum(raw, [
        "TotalMetAppts",
        "Total Met Appts",
        "total_met_appts",
        "MET Count",
        "met_count",
      ]);

      if (totalAppointments != null && totalAppointments > 0) {
        totalAppts += totalAppointments;
        totalMet += metCount ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "MetRate",
        "Met Rate",
        "met_rate",
        "met_rate_pct",
        "met",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalAppts > 0) {
      finalValue = computePct(totalAppts, totalMet);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}