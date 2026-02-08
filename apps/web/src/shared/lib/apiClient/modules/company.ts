import type { ApiModuleCtx } from "./_ctx";

export async function resolveCoDisplay(
  ctx: ApiModuleCtx,
  input: { co_ref_id?: string | null; co_code?: string | null }
): Promise<{ kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null> {
  const co_ref_id = input.co_ref_id ?? null;
  const co_code = input.co_code ?? null;

  if (co_ref_id) {
    const company = await ctx.supabase
      .from("company_admin_v")
      .select("company_id, company_name")
      .eq("company_id", co_ref_id)
      .maybeSingle();

    if (!company.error && company.data?.company_name) {
      return { kind: "company", name: company.data.company_name, matched_on: "id" };
    }

    const contractor = await ctx.supabase
      .from("contractor_admin_v")
      .select("contractor_id, contractor_name")
      .eq("contractor_id", co_ref_id)
      .maybeSingle();

    if (!contractor.error && contractor.data?.contractor_name) {
      return { kind: "contractor", name: contractor.data.contractor_name, matched_on: "id" };
    }
  }

  if (co_code) {
    const companyByCode = await ctx.supabase
      .from("company_admin_v")
      .select("company_code, company_name")
      .eq("company_code", co_code)
      .maybeSingle();

    if (!companyByCode.error && companyByCode.data?.company_name) {
      return { kind: "company", name: companyByCode.data.company_name, matched_on: "code" };
    }

    const contractorByCode = await ctx.supabase
      .from("contractor_admin_v")
      .select("contractor_code, contractor_name")
      .eq("contractor_code", co_code)
      .maybeSingle();

    if (!contractorByCode.error && contractorByCode.data?.contractor_name) {
      return { kind: "contractor", name: contractorByCode.data.contractor_name, matched_on: "code" };
    }
  }

  return null;
}