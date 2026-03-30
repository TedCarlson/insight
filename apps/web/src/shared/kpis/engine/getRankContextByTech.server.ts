import type {
  RankContextByPerson,
  RankResolverConfig,
} from "@/shared/kpis/contracts/rankTypes";

import type { MetricsRangeKey } from "@/shared/kpis/core/types";

import { resolveRankContextByTech } from "@/shared/kpis/engine/resolveRankContextByTech";
import { resolveEligibleRankPopulation } from "@/shared/kpis/engine/resolveEligibleRankPopulation.server";

type ReportClassType = "P4P" | "SMART" | "TECH";

type Args = {
  pc_org_ids: string[];
  class_type: ReportClassType;
  range: MetricsRangeKey;
  batch_id?: string | null;

  /**
   * Live fallback map for team assignment when snapshot
   * direct_reports_to_person_id is null or stale.
   */
  team_key_by_person?: Map<string, string>;

  config?: RankResolverConfig;
};

export async function getRankContextByTech(
  args: Args
): Promise<RankContextByPerson> {
  const rows = await resolveEligibleRankPopulation({
    pc_org_ids: args.pc_org_ids,
    class_type: args.class_type,
    range: args.range,
    batch_id: args.batch_id ?? null,
    team_key_by_person: args.team_key_by_person,
  });

  return resolveRankContextByTech(rows, args.config);
}