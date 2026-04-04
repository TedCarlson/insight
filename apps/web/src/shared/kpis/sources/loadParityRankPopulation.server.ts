import type { RankInputRow } from "@/shared/kpis/contracts/rankTypes";

type ReportClassType = "P4P" | "SMART" | "TECH";

type ScopedAssignmentLike = {
  tech_id?: string | null;
  contractor_name?: string | null;
};

type Args = {
  pc_org_ids: string[];
  class_type: ReportClassType;
  scoped_assignments: ScopedAssignmentLike[];
  batch_id?: string | null;
};

export async function loadParityRankPopulation(
  _args: Args
): Promise<RankInputRow[]> {
  /**
   * Intentionally disabled for now.
   *
   * Reason:
   * Parity group ranking must be computed from authoritative grouped facts,
   * not from averaging tech-level composite scores or averaging rendered KPI cells.
   *
   * Returning an empty population is safer than emitting false ranks.
   */
  return [];
}