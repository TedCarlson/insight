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

export async function resolveBpToolUsageByTech(args: {
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

    let totalEligible = 0;
    let totalCompliant = 0;
    const fallbackRates: number[] = [];

    for (const month of selectedMonths) {
      const raw = month.row.raw;

      const eligible = pickNum(raw, [
        "TUEligibleJobs",
        "tu_eligible_jobs",
        "TU Eligible Jobs",
      ]);

      const compliant = pickNum(raw, [
        "TUResult",
        "tu_result",
        "TU Result",
        "tu_compliant_jobs",
      ]);

      if (eligible != null && eligible > 0) {
        totalEligible += eligible;
        totalCompliant += compliant ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "ToolUsage",
        "ToolUsage%",
        "Tool Usage",
        "Tool Usage%",
        "tool_usage_rate",
        "tool_usage",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalEligible > 0) {
      finalValue = computePct(totalEligible, totalCompliant);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}