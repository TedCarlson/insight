// apps/web/src/app/api/route-lock/quota/lookups/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function guardSelectedOrgRosterManage() {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) return { ok: false as const, status: 401, error: "unauthorized" };

  const { data: profile, error: profileErr } = await sb
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) return { ok: false as const, status: 500, error: profileErr.message };

  const pc_org_id = (profile?.selected_pc_org_id ?? null) as string | null;
  if (!pc_org_id) return { ok: false as const, status: 409, error: "no selected org" };

  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
  const { data: allowed, error: permErr } = await apiClient.rpc("has_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_key: "roster_manage",
  });

  if (permErr || !allowed) return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, pc_org_id, auth_user_id: user.id };
}

function isoDateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

async function handler() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return NextResponse.json({ ok: false, error: "missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  if (!service) return NextResponse.json({ ok: false, error: "missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const guard = await guardSelectedOrgRosterManage();
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Limit months to: 3 months back OR oldest record (if newer), plus ~2 months ahead.
  const today = new Date();
  const startDefault = new Date(today);
  startDefault.setDate(startDefault.getDate() - 92); // ~3 months back

  const endDefault = new Date(today);
  endDefault.setDate(endDefault.getDate() + 70); // ~2 months ahead

  // If the org has fewer than 3 months of history, start at oldest record’s month start.
  const { data: oldestRow } = await admin
    .from("quota_admin_v")
    .select("fiscal_month_start_date")
    .eq("pc_org_id", guard.pc_org_id)
    .order("fiscal_month_start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const oldestStart = oldestRow?.fiscal_month_start_date ? new Date(oldestRow.fiscal_month_start_date) : null;
  const windowStart = oldestStart && oldestStart > startDefault ? oldestStart : startDefault;

  const windowStartISO = isoDateOnly(windowStart);
  const windowEndISO = isoDateOnly(endDefault);

  const { data: routes, error: routesErr } = await admin
    .from("route_admin_v")
    .select("route_id, route_name")
    .eq("pc_org_id", guard.pc_org_id)
    .order("route_name", { ascending: true });

  if (routesErr) {
    return NextResponse.json({ ok: false, error: routesErr.message }, { status: 500 });
  }

  const { data: months, error: monthsErr } = await admin
    .from("fiscal_month_dim")
    .select("fiscal_month_id, month_key, label, start_date, end_date")
    .gte("start_date", windowStartISO)
    .lte("start_date", windowEndISO)
    .order("start_date", { ascending: false });

  if (monthsErr) {
    return NextResponse.json({ ok: false, error: monthsErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    routes: routes ?? [],
    months: months ?? [],
    debug: {
      selected_pc_org_id: guard.pc_org_id,
      auth_user_id: guard.auth_user_id,
      month_window: { start: windowStartISO, end: windowEndISO },
    },
  });
}

export async function POST() {
  return handler();
}

// Optional: allow GET for manual testing in browser
export async function GET() {
  return handler();
}