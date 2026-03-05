export type ScorecardContext = {
  pc_org_id: string | null;
  fiscal_month_key: string | null;
  tech_id: string | null;
};

export async function getScorecardContext(): Promise<ScorecardContext> {
  return {
    pc_org_id: null,
    fiscal_month_key: null,
    tech_id: null,
  };
}