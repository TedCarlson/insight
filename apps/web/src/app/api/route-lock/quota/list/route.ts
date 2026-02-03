// apps/web/src/app/api/route-lock/quota/list/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GuardOk = { ok: true; pc_org_id: string; auth_user_id: string; apiClient: any };
type GuardFail = { ok: false; status: number; error: string; debug?: any };

async function hasAnyRole(admin: any, auth_user_id: string, roleKeys: string[]): Promise<boolean> {
  const { data, error } = await admin.from("user_roles").select("role_key").eq("auth_user_id", auth_user_id);
  if (error) return false;
  const roles = (data ?? []).map((r: any) => String(r?.role_key ?? ""));
  return roles.some((rk: string) => roleKeys.includes(rk));
}

async function guardSelectedOrgQuotaAccess(): Promise<GuardOk | GuardFail> {
  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user?.id) return { ok: false, status: 401, error: "unauthorized", debug: { step: "no_user" } };
  const userId = user.id;

  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id,status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profErr) return { ok: false, status: 500, error: profErr.message, debug: { step: "profile_read_error", profErr } };

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) return { ok: false, status: 409, error: "No PC org selected", debug: { step: "no_selected_org" } };

  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;

  const { data: canAccess, error: accessErr } = await apiClient.rpc("can_access_pc_org", { p_pc_org_id: pc_org_id });
  if (accessErr || !canAccess) return { ok: false, status: 403, error: "forbidden", debug: { step: "baseline_access_rpc", accessErr, canAccess } };

  const { data: ownerRow, error: ownerErr } = await admin
    .from("app_owners")
    .select("auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (ownerErr) return { ok: false, status: 500, error: ownerErr.message, debug: { step: "owner_check_error", ownerErr } };
  if (ownerRow?.auth_user_id) return { ok: true, pc_org_id, auth_user_id: userId, apiClient };

  const roleAllowed = await hasAnyRole(admin, userId, ["admin", "dev", "director", "manager", "vp"]);
  if (roleAllowed) return { ok: true, pc_org_id, auth_user_id: userId, apiClient };

  const { data: allowedByGrant, error: grantRpcErr } = await apiClient.rpc("has_any_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_keys: ["route_lock_manage", "roster_manage"],
  });

  if (grantRpcErr) return { ok: false, status: 403, error: "forbidden", debug: { step: "grant_rpc_error", grantRpcErr } };
  if (!allowedByGrant) return { ok: false, status: 403, error: "forbidden", debug: { step: "no_matching_grant" } };

  return { ok: true, pc_org_id, auth_user_id: userId, apiClient };
}

export async function POST(req: Request) {
  try {
    const guard = await guardSelectedOrgQuotaAccess();
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error, debug: guard.debug ?? null }, { status: guard.status });

    const admin = supabaseAdmin();
    const body = (await req.json().catch(() => ({}))) as any;

    const fiscal_month_id = String(body?.fiscal_month_id ?? "").trim() || null;
    const limitRaw = Number(body?.limit ?? 500);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 500;

    let q = admin.from("quota_admin_v").select("*").eq("pc_org_id", guard.pc_org_id);
    if (fiscal_month_id) q = q.eq("fiscal_month_id", fiscal_month_id);

    const { data, error } = await q
      .order("fiscal_month_start_date", { ascending: false })
      .order("route_name", { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      debug: {
        selected_pc_org_id: guard.pc_org_id,
        auth_user_id: guard.auth_user_id,
        returned: (data ?? []).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "List failed" }, { status: 500 });
  }
}