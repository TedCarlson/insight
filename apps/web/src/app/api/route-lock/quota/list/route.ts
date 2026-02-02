// apps/web/src/app/api/route-lock/quota/list/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function guardSelectedOrg() {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profErr) {
    return { ok: false as const, status: 500, error: profErr.message };
  }

  const selected = String(profile?.selected_pc_org_id ?? "").trim();
  if (!selected) {
    return { ok: false as const, status: 400, error: "No PC org selected" };
  }

  return { ok: true as const, auth_user_id: user.id, pc_org_id: selected };
}

export async function POST(req: Request) {
  try {
    const guard = await guardSelectedOrg();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
    }

    const admin = supabaseAdmin();

    const body = (await req.json().catch(() => ({}))) as any;

    // Allow the client to pass pc_org_id, but do NOT trust it.
    const pc_org_id = guard.pc_org_id;

    const fiscal_month_id = String(body?.fiscal_month_id ?? "").trim() || null;
    const limitRaw = Number(body?.limit ?? 500);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 500;

    let q = admin.from("quota_admin_v").select("*").eq("pc_org_id", pc_org_id);

    if (fiscal_month_id) {
      q = q.eq("fiscal_month_id", fiscal_month_id);
    }

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