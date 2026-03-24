import { supabaseAdmin } from "@/shared/data/supabase/admin";
import {
  avgOrNull,
  computePct,
  fetchMetricRawRows,
  groupRowsByTech,
  pickNum,
  type RangeKey,
} from "./shared";

export async function resolveBpSoiByTech(args: {
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

    let totalInstalls = 0;
    let totalSoi = 0;
    const fallbackRates: number[] = [];

    for (const row of techRows) {
      const raw = row.raw;

      const installs = pickNum(raw, [
        "Installs",
        "installs",
        "install_count",
        "Install Count",
        "Total Installs",
        "total_installs",
      ]);

      const soiCount = pickNum(raw, [
        "SOI Count",
        "soi_count",
        "SOICount",
        "SOI",
      ]);

      if (installs != null && installs > 0) {
        totalInstalls += installs;
        totalSoi += soiCount ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "SOI Rate%",
        "SOI Rate %",
        "soi_rate",
        "soi_rate_pct",
        "soi",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalInstalls > 0) {
      finalValue = computePct(totalInstalls, totalSoi);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}