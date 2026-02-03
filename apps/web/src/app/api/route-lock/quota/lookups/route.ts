// apps/web/src/app/api/route-lock/quota/lookups/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type GuardOk = {
  ok: true;
  pc_org_id: string;
  auth_user_id: string;
};

type GuardFail = {
  ok: false;
  status: number;
  error: string;
};

async function guardSelectedOrgQuotaAccess(): Promise<GuardOk | GuardFail> {
  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const { data, error: userErr } = await sb.auth.getUser();
  const user = data?.user ?? null;

  if (userErr || !user) {
    return { ok: false, status: 401, error: "not_authenticated" };
  }

  // Read selected org using service role (bypass RLS on user_profile)
  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profErr) return { ok: false, status: 500, error: profErr.message };

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) return { ok: false, status: 409, error: "no_selected_pc_org" };

  // IMPORTANT:
  // Do NOT use api RPC here. Managers often won't have EXECUTE on api schema/functions.
  // Instead, verify the grant row exists via service role.
  //
  // Primary permission for Route Lock management: roster_manage
  // Optional future split: quota_manage
  const { data: grantRows, error: grantErr } = await admin
    .from("pc_org_permission_grant")
    .select("permission_key, expires_at")
    .eq("pc_org_id", pc_org_id)
    .eq("auth_user_id", user.id)
    .in("permission_key", ["roster_manage", "quota_manage"]);

  if (grantErr) {
    // If something is wrong with grants table access/schema, treat as forbidden (not 500)
    // so we don't leak internals and we keep UI behavior consistent.
    return { ok: false, status: 403, error: "forbidden" };
  }

  const nowIso = new Date().toISOString();
  const allowed = (grantRows ?? []).some((g: any) => {
    const exp = g?.expires_at ? String(g.expires_at) : "";
    // allowed if no expiry or expiry in the future
    return !exp || exp > nowIso;
  });

  if (!allowed) return { ok: false, status: 403, error: "forbidden" };

  return { ok: true, pc_org_id, auth_user_id: user.id };
}

function isoDateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

async function handler() {
  const guard = await guardSelectedOrgQuotaAccess();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const admin = supabaseAdmin();

  // Limit months to: ~3 months back + ~2 months ahead (or oldest record if newer)
  const today = new Date();
  const startDefault = new Date(today);
  startDefault.setDate(startDefault.getDate() - 92);

  const endDefault = new Date(today);
  endDefault.setDate(endDefault.getDate() + 70);

  // If org has fewer than 3 months of history, start at oldest record’s month start.
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

// Allow GET too so you never get a 405 if a caller hits it via browser / tooling.
export async function GET() {
  return handler();
}