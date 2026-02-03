// apps/web/src/app/api/route-lock/quota/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GuardOk = {
  ok: true;
  sb: any; // cookie-aware user client
  apiClient: any; // sb.schema("api")
  admin: ReturnType<typeof supabaseAdmin>; // service role
  auth_user_id: string;
  pc_org_id: string;
};

type GuardFail = {
  ok: false;
  status: number;
  error: string;
  debug?: any; // allow debug payloads without TS errors
};

async function hasAnyRole(admin: any, auth_user_id: string, roleKeys: string[]): Promise<boolean> {
  const { data, error } = await admin.from("user_roles").select("role_key").eq("auth_user_id", auth_user_id);
  if (error) return false;
  const roles: string[] = (data ?? []).map((r: { role_key?: unknown }) => String(r?.role_key ?? ""));
  return roles.some((rk: string) => roleKeys.includes(rk));
}

/**
 * Guard for Quota rollup build.
 * Must be scoped to selected_pc_org_id and allow:
 * - owner
 * - ITG management roles (admin/dev/director/manager/vp)
 * - explicit org-scoped grants: route_lock_manage OR roster_manage
 *
 * Always requires baseline org access via api.can_access_pc_org(selected_org).
 */
async function guardSelectedOrgQuotaAccess(): Promise<GuardOk | GuardFail> {
  const sb = await supabaseServer(); // ✅ cookie/session-aware in Next routes
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user?.id) return { ok: false, status: 401, error: "unauthorized", debug: { step: "no_user" } };
  const userId = user.id;

  // Read selected org using service role (bypass RLS on user_profile)
  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id,status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profErr) return { ok: false, status: 500, error: profErr.message, debug: { step: "profile_read_error", profErr } };

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) return { ok: false, status: 409, error: "no selected org", debug: { step: "no_selected_org" } };

  // Use api schema for baseline org access (session-aware)
  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;

  const { data: canAccess, error: accessErr } = await apiClient.rpc("can_access_pc_org", { p_pc_org_id: pc_org_id });
  if (accessErr) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      debug: { step: "baseline_access_rpc", accessErr },
    };
  }
  if (!canAccess) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      debug: { step: "baseline_access_false", pc_org_id },
    };
  }

  // ✅ Owner bypass
  const { data: ownerRow, error: ownerErr } = await admin
    .from("app_owners")
    .select("auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (ownerErr) return { ok: false, status: 500, error: ownerErr.message, debug: { step: "owner_check_error", ownerErr } };
  if (ownerRow?.auth_user_id) return { ok: true, sb, apiClient, admin, auth_user_id: userId, pc_org_id };

  // ✅ Role bypass (ITG management roles)
  const roleAllowed = await hasAnyRole(admin, userId, ["admin", "dev", "director", "manager", "vp"]);
  if (roleAllowed) return { ok: true, sb, apiClient, admin, auth_user_id: userId, pc_org_id };

  // ✅ Canonical grants check via boolean RPC (no direct table read)
  const { data: allowedByGrant, error: grantRpcErr } = await apiClient.rpc("has_any_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_keys: ["route_lock_manage", "roster_manage"],
  });

  if (grantRpcErr) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      debug: { step: "grant_rpc_error", grantRpcErr },
    };
  }

  if (!allowedByGrant) {
    return {
      ok: false,
      status: 403,
      error: "forbidden",
      debug: { step: "no_matching_grant", pc_org_id },
    };
  }

  return { ok: true, sb, apiClient, admin, auth_user_id: userId, pc_org_id };
}

export async function POST(req: Request) {
  const guard = await guardSelectedOrgQuotaAccess();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error, debug: guard.debug ?? null },
      { status: guard.status }
    );
  }

  const body = await req.json().catch(() => null);
  const fiscal_month_start_date = String(body?.fiscal_month_start_date ?? "").trim();
  const fiscal_month_end_date = String(body?.fiscal_month_end_date ?? "").trim();
  if (!fiscal_month_start_date || !fiscal_month_end_date) {
    return NextResponse.json({ ok: false, error: "Missing fiscal month dates" }, { status: 400 });
  }

  // Build rollup (api schema)
  const { data: built, error: buildErr } = await guard.apiClient.rpc("quota_rollup_build", {
    p_pc_org_id: guard.pc_org_id,
    p_fiscal_month_start_date: fiscal_month_start_date,
    p_fiscal_month_end_date: fiscal_month_end_date,
  });

  if (buildErr) {
    return NextResponse.json(
      { ok: false, error: buildErr.message, debug: { step: "quota_rollup_build_error", buildErr } },
      { status: 500 }
    );
  }

  // Read rows via user client (RLS applies)
  const { data: rows, error: rowsErr } = await guard.sb
    .from("quota_rollup")
    .select("*")
    .eq("pc_org_id", guard.pc_org_id)
    .eq("fiscal_month_start_date", fiscal_month_start_date)
    .eq("fiscal_month_end_date", fiscal_month_end_date)
    .order("route_name", { ascending: true });

  if (rowsErr) {
    return NextResponse.json(
      { ok: false, error: rowsErr.message, debug: { step: "quota_rollup_read_error", rowsErr } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    built: built ?? null,
    pc_org_id: guard.pc_org_id,
    rows: rows ?? [],
    debug: {
      auth_user_id: guard.auth_user_id,
      selected_pc_org_id: guard.pc_org_id,
    },
  });
}

// Optional safety: avoid accidental 405s from tooling
export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST" }, { status: 405 });
}