import type { PcOrgPermissionGrantRow, PermissionDefRow } from "../types";
import type { ApiModuleCtx } from "./_ctx";

export async function permissionDefs(ctx: ApiModuleCtx): Promise<PermissionDefRow[]> {
  const { data, error } = await ctx.supabase
    .from("permission_def")
    .select("permission_key,description,created_at")
    .order("permission_key", { ascending: true });

  if (error) throw ctx.normalize(error);
  return (data as any) ?? [];
}

export async function permissionsForOrg(
  ctx: ApiModuleCtx,
  pc_org_id: string
): Promise<PcOrgPermissionGrantRow[]> {
  return (
    (await ctx.rpcWithFallback<PcOrgPermissionGrantRow[]>("permissions_for_org", [
      { p_pc_org_id: pc_org_id },
      { pc_org_id },
    ])) ?? []
  );
}

export async function permissionGrant(
  ctx: ApiModuleCtx,
  input: {
    pc_org_id: string;
    auth_user_id: string;
    permission_key: string;
    expires_at?: string | null;
    notes?: string | null;
  }
): Promise<PcOrgPermissionGrantRow> {
  const { pc_org_id, auth_user_id, permission_key } = input;
  const p_expires_at = input.expires_at ?? null;
  const p_notes = input.notes ?? null;

  return await ctx.rpcWithFallback<PcOrgPermissionGrantRow>("permission_grant", [
    {
      p_pc_org_id: pc_org_id,
      p_auth_user_id: auth_user_id,
      p_permission_key: permission_key,
      p_expires_at,
      p_notes,
    },
    {
      pc_org_id,
      auth_user_id,
      permission_key,
      expires_at: p_expires_at,
      notes: p_notes,
    },
  ]);
}

export async function permissionRevoke(
  ctx: ApiModuleCtx,
  input: { pc_org_id: string; auth_user_id: string; permission_key: string }
): Promise<boolean> {
  const { pc_org_id, auth_user_id, permission_key } = input;

  const out = await ctx.rpcWithFallback<boolean>("permission_revoke", [
    { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id, p_permission_key: permission_key },
    { pc_org_id, auth_user_id, permission_key },
  ]);

  return !!out;
}