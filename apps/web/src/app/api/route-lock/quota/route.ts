// apps/web/src/app/api/route-lock/quota/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function guardSelectedOrgRosterManage(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    return { ok: false as const, status: 500, error: "Missing Supabase env vars" };
  }

  // Use bearer token if present; otherwise rely on cookies (same-origin fetch)
  const authHeader = req.headers.get("authorization") ?? "";
  const sb = createClient(url, anon, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  });

  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) return { ok: false as const, status: 401, error: "unauthorized" };

  // IMPORTANT: read selected org via service-role to avoid user_profile RLS surprises
  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profErr) return { ok: false as const, status: 500, error: profErr.message };

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) return { ok: false as const, status: 409, error: "no selected org" };

  // Your RPC is in schema "api"
  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;

  const { data: allowed, error: permErr } = await apiClient.rpc("has_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_key: "roster_manage",
  });

  if (permErr) return { ok: false as const, status: 500, error: permErr.message };
  if (!allowed) return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, sb, apiClient, admin, auth_user_id: user.id, pc_org_id };
}

export async function POST(req: Request) {
  const guard = await guardSelectedOrgRosterManage(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const fiscal_month_start_date = String(body?.fiscal_month_start_date ?? "").trim();
  const fiscal_month_end_date = String(body?.fiscal_month_end_date ?? "").trim();
  if (!fiscal_month_start_date || !fiscal_month_end_date) {
    return NextResponse.json({ ok: false, error: "Missing fiscal month dates" }, { status: 400 });
  }

  // quota_rollup_build is also in schema "api"
  const { data: built, error: buildErr } = await guard.apiClient.rpc("quota_rollup_build", {
    p_pc_org_id: guard.pc_org_id,
    p_fiscal_month_start_date: fiscal_month_start_date,
    p_fiscal_month_end_date: fiscal_month_end_date,
  });

  if (buildErr) return NextResponse.json({ ok: false, error: buildErr.message }, { status: 500 });

  // Pull the rollup rows from public table/view (should be accessible via normal policies)
  const { data: rows, error: rowsErr } = await guard.sb
    .from("quota_rollup")
    .select("*")
    .eq("pc_org_id", guard.pc_org_id)
    .eq("fiscal_month_start_date", fiscal_month_start_date)
    .eq("fiscal_month_end_date", fiscal_month_end_date)
    .order("route_name", { ascending: true });

  if (rowsErr) return NextResponse.json({ ok: false, error: rowsErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    built: built ?? null,
    pc_org_id: guard.pc_org_id,
    rows: rows ?? [],
  });
}