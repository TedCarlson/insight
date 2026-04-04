import { supabaseAdmin } from "@/shared/data/supabase/admin";

export async function fetchMetricFacts(pcOrgId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("metrics_tech_fact_day")
    .select("*")
    .eq("pc_org_id", pcOrgId);

  if (error) {
    throw new Error(`fetchMetricFacts failed: ${error.message}`);
  }

  return data ?? [];
}