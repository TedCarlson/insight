import type { PcOrgEligibilityRow } from "../types";
import type { ApiModuleCtx } from "./_ctx";

export async function pcOrgEligibilityForUser(
  ctx: ApiModuleCtx,
  auth_user_id: string
): Promise<PcOrgEligibilityRow[]> {
  return (
    (await ctx.rpcWithFallback<PcOrgEligibilityRow[]>("pc_org_eligibility_for_user", [
      { p_auth_user_id: auth_user_id },
      { auth_user_id },
    ])) ?? []
  );
}

export async function pcOrgEligibilityGrant(
  ctx: ApiModuleCtx,
  input: { pc_org_id: string; auth_user_id: string }
): Promise<boolean> {
  const { pc_org_id, auth_user_id } = input;

  const out = await ctx.rpcWithFallback<boolean>("pc_org_eligibility_grant", [
    { p_auth_user_id: auth_user_id, p_pc_org_id: pc_org_id },
    { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id },
  ]);

  return !!out;
}

export async function pcOrgEligibilityRevoke(
  ctx: ApiModuleCtx,
  input: { pc_org_id: string; auth_user_id: string }
): Promise<boolean> {
  const { pc_org_id, auth_user_id } = input;

  const out = await ctx.rpcWithFallback<boolean>("pc_org_eligibility_revoke", [
    { p_auth_user_id: auth_user_id, p_pc_org_id: pc_org_id },
    { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id },
  ]);

  return !!out;
}