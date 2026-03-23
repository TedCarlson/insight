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

export async function resolveBp48HrByTech(args: {
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
    let totalContacts = 0;
    const fallbackRates: number[] = [];

    for (const month of selectedMonths) {
      const raw = month.row.raw;

      const eligible = pickNum(raw, [
        "48Hr Eligible Orders",
        "48hr_eligible_orders",
        "48hr eligible",
        "callback_48hr_eligible",
        "Total Orders",
        "total_orders",
      ]);

      const contacts = pickNum(raw, [
        "48Hr Contact Orders",
        "48HrContactOrders",
        "contact_orders_48hr",
        "callback_48hr_contacts",
      ]);

      if (eligible != null && eligible > 0) {
        totalEligible += eligible;
        totalContacts += contacts ?? 0;
        continue;
      }

      const fallback = pickNum(raw, [
        "48Hr Contact Rate%",
        "48Hr Contact Rate %",
        "48HrContactRate",
        "contact_rate_48hr",
        "contact_48hr_rate",
        "contact_48hr",
        "callback_rate_48hr",
      ]);

      if (fallback != null && Number.isFinite(fallback)) {
        fallbackRates.push(fallback);
      }
    }

    let finalValue: number | null = null;

    if (totalEligible > 0) {
      finalValue = computePct(totalEligible, totalContacts);
    } else {
      finalValue = avgOrNull(fallbackRates);
    }

    result.set(techId, finalValue);
  }

  return result;
}