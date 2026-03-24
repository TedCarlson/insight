import { supabaseAdmin } from "@/shared/data/supabase/admin";

import { resolveBpTnpsByTech } from "./kpiResolvers/tnpsResolver";
import { resolveBpFtrByTech } from "./kpiResolvers/ftrResolver";
import { resolveBpToolUsageByTech } from "./kpiResolvers/toolUsageResolver";
import { resolveBpPurePassByTech } from "./kpiResolvers/purePassResolver";
import { resolveBp48HrByTech } from "./kpiResolvers/contact48HrResolver";
import { resolveBpRepeatByTech } from "./kpiResolvers/repeatResolver";
import { resolveBpReworkByTech } from "./kpiResolvers/reworkResolver";
import { resolveBpSoiByTech } from "./kpiResolvers/soiResolver";
import { resolveBpMetByTech } from "./kpiResolvers/metResolver";
import {
  resolveFiscalEndDatesForRange,
  type RangeKey,
} from "./kpiResolvers/shared";

export type { RangeKey };

export type KpiOverrideMaps = Record<string, Map<string, number | null>>;

type Args = {
  admin?: ReturnType<typeof supabaseAdmin>;
  techIds: string[];
  pcOrgIds: string[];
  range: RangeKey;
};

function emptyOverrides(): KpiOverrideMaps {
  const make = () => new Map<string, number | null>();

  return {
    tnps: make(),
    tnps_score: make(),

    ftr_rate: make(),

    tool_usage: make(),
    tool_usage_rate: make(),

    pure_pass: make(),
    pure_pass_rate: make(),
    pht_pure_pass_rate: make(),

    contact_48hr: make(),
    contact_48hr_rate: make(),
    callback_rate_48hr: make(),

    repeat: make(),
    repeat_rate: make(),

    rework: make(),
    rework_rate: make(),

    soi: make(),
    soi_rate: make(),

    met: make(),
    met_rate: make(),
  };
}

export async function resolveAllBpKpis(args: Args): Promise<KpiOverrideMaps> {
  const admin = args.admin ?? supabaseAdmin();
  const { techIds, pcOrgIds, range } = args;

  if (!techIds.length || !pcOrgIds.length) {
    return emptyOverrides();
  }

  const fiscalEndDates = await resolveFiscalEndDatesForRange({
    admin,
    range,
  });

  const sharedArgs = {
    admin,
    techIds,
    pcOrgIds,
    range,
    fiscalEndDates,
  };

  const [
    tnpsByTech,
    ftrByTech,
    toolUsageByTech,
    purePassByTech,
    contact48ByTech,
    repeatByTech,
    reworkByTech,
    soiByTech,
    metByTech,
  ] = await Promise.all([
    resolveBpTnpsByTech(sharedArgs),
    resolveBpFtrByTech(sharedArgs),
    resolveBpToolUsageByTech(sharedArgs),
    resolveBpPurePassByTech(sharedArgs),
    resolveBp48HrByTech(sharedArgs),
    resolveBpRepeatByTech(sharedArgs),
    resolveBpReworkByTech(sharedArgs),
    resolveBpSoiByTech(sharedArgs),
    resolveBpMetByTech(sharedArgs),
  ]);

  return {
    tnps: tnpsByTech,
    tnps_score: tnpsByTech,

    ftr_rate: ftrByTech,

    tool_usage: toolUsageByTech,
    tool_usage_rate: toolUsageByTech,

    pure_pass: purePassByTech,
    pure_pass_rate: purePassByTech,
    pht_pure_pass_rate: purePassByTech,

    contact_48hr: contact48ByTech,
    contact_48hr_rate: contact48ByTech,
    callback_rate_48hr: contact48ByTech,

    repeat: repeatByTech,
    repeat_rate: repeatByTech,

    rework: reworkByTech,
    rework_rate: reworkByTech,

    soi: soiByTech,
    soi_rate: soiByTech,

    met: metByTech,
    met_rate: metByTech,
  };
}