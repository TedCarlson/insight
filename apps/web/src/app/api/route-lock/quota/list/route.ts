// apps/web/src/app/api/route-lock/quota/list/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GuardOk = { ok: true; auth_user_id: string; pc_org_id: string };
type GuardFail = { ok: false; status: number; error: string };

async function guardSelectedOrgRosterManage(): Promise<GuardOk | GuardFail> {
  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const userId = user.id;

  // Selected org comes from user_profile (admin read)
  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profErr) {
    return { ok: false, status: 500, error: profErr.message };
  }

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) {
    return { ok: false, status: 409, error: "No PC org selected" };
  }

  // ✅ Owner bypass
  const { data: ownerRow, error: ownerErr } = await admin
    .from("app_owners")
    .select("auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (ownerErr) return { ok: false, status: 500, error: ownerErr.message };
  if (ownerRow?.auth_user_id) return { ok: true, auth_user_id: userId, pc_org_id };

  // ✅ Canonical grants check (api schema)
  const { data: grants, error: grantErr } = await (admin as any)
    .schema("api")
    .from("pc_org_permission_grant")
    .select("permission_key, expires_at, revoked_at")
    .eq("pc_org_id", pc_org_id)
    .eq("grantee_user_id", userId)
    .is("revoked_at", null)
    .in("permission_key", ["route_lock_manage", "roster_manage"]);

  if (grantErr) return { ok: false, status: 403, error: "forbidden" };

  const nowIso = new Date().toISOString();
  const allowed = (grants ?? []).some((g: any) => {
    const exp = g?.expires_at ? String(g.expires_at) : "";
    return !exp || exp > nowIso;
  });

  if (!allowed) return { ok: false, status: 403, error: "forbidden" };

  return { ok: true, auth_user_id: userId, pc_org_id };
}

export async function POST(req: Request) {
  try {
    const guard = await guardSelectedOrgRosterManage();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
    }

    const admin = supabaseAdmin();
    const body = (await req.json().catch(() => ({}))) as any;

    // Do NOT trust client-passed org id
    const pc_org_id = guard.pc_org_id;

    const fiscal_month_id = String(body?.fiscal_month_id ?? "").trim() || null;
    const limitRaw = Number(body?.limit ?? 500);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 500;

    let q = admin.from("quota_admin_v").select("*").eq("pc_org_id", pc_org_id);
    if (fiscal_month_id) q = q.eq("fiscal_month_id", fiscal_month_id);

    const { data, error } = await q
      .order("fiscal_month_start_date", { ascending: false })
      .order("route_name", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      debug: {
        selected_pc_org_id: pc_org_id,
        auth_user_id: guard.auth_user_id,
        returned: (data ?? []).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "List failed" }, { status: 500 });
  }
}