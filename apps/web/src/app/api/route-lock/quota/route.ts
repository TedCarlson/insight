// apps/web/src/app/api/route-lock/quota/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getSelectedPcOrgId(supabase: any, authUserId: string) {
  const { data, error } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const id = (data?.selected_pc_org_id ?? null) as string | null;
  return id;
}

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return NextResponse.json({ ok: false, error: "missing env: NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  if (!service) return NextResponse.json({ ok: false, error: "missing env: SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user || userErr) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const selected_pc_org_id = await getSelectedPcOrgId(supabase, user.id);
  if (!selected_pc_org_id) return NextResponse.json({ ok: false, error: "no selected org" }, { status: 409 });

  // service-role client for reads (views) — permission gating happens elsewhere (writes)
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const [routesRes, monthsRes, quotaRes] = await Promise.all([
    admin
      .from("route_admin_v")
      .select(
        "route_id, route_name, pc_org_id, pc_org_name, mso_id, mso_name, division_id, division_name, division_code, region_id, region_name, region_code, pc_id, pc_number"
      )
      .eq("pc_org_id", selected_pc_org_id)
      .order("route_name", { ascending: true }),

    admin
      .from("fiscal_month_dim")
      .select("fiscal_month_id, month_key, label, start_date, end_date")
      .order("start_date", { ascending: false })
      .limit(36),

    admin
      .from("quota_admin_v")
      .select(
        "quota_id, route_id, route_name, fiscal_month_id, fiscal_month_key, fiscal_month_label, fiscal_month_start_date, fiscal_month_end_date, pc_org_id, pc_org_name, qh_sun,qh_mon,qh_tue,qh_wed,qh_thu,qh_fri,qh_sat, qu_sun,qu_mon,qu_tue,qu_wed,qu_thu,qu_fri,qu_sat, qt_hours, qt_units"
      )
      .eq("pc_org_id", selected_pc_org_id)
      .order("fiscal_month_start_date", { ascending: false })
      .order("route_name", { ascending: true })
      .limit(500),
  ]);

  if (routesRes.error) return NextResponse.json({ ok: false, error: routesRes.error.message }, { status: 500 });
  if (monthsRes.error) return NextResponse.json({ ok: false, error: monthsRes.error.message }, { status: 500 });
  if (quotaRes.error) return NextResponse.json({ ok: false, error: quotaRes.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    routes: routesRes.data ?? [],
    months: monthsRes.data ?? [],
    quota: quotaRes.data ?? [],
    debug: {
      selected_pc_org_id,
      auth_user_id: user.id,
    },
  });
}