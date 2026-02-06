// apps/web/src/app/api/route-lock/routes/list/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

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

async function handler() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return NextResponse.json({ ok: false, error: "missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  if (!service) return NextResponse.json({ ok: false, error: "missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const guard = await guardSelectedOrgRosterManage();
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const admin = supabaseAdmin();

  // Count from base table
  const { count: routeCount, error: countErr } = await admin
    .from("route")
    .select("*", { count: "exact", head: true })
    .eq("pc_org_id", guard.pc_org_id);

  // Count from view
  const { count: viewCount, error: viewCountErr } = await admin
    .from("route_admin_v")
    .select("*", { count: "exact", head: true })
    .eq("pc_org_id", guard.pc_org_id);

  // Read rows from view
  const { data, error } = await admin
    .from("route_admin_v")
    .select(
      "route_id, route_name, pc_org_id, pc_org_name, pc_number, mso_name, division_name, division_code, region_name, region_code"
    )
    .eq("pc_org_id", guard.pc_org_id)
    .order("route_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        debug: {
          selected_pc_org_id: guard.pc_org_id,
          auth_user_id: guard.auth_user_id,
          supabase_url_host: (() => {
            try {
              return new URL(url).host;
            } catch {
              return url;
            }
          })(),
          routeCount: countErr ? `count error: ${countErr.message}` : routeCount ?? null,
          viewCount: viewCountErr ? `count error: ${viewCountErr.message}` : viewCount ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    items: data ?? [],
    debug: {
      selected_pc_org_id: guard.pc_org_id,
      auth_user_id: guard.auth_user_id,
      supabase_url_host: (() => {
        try {
          return new URL(url).host;
        } catch {
          return url;
        }
      })(),
      routeCount: countErr ? `count error: ${countErr.message}` : routeCount ?? null,
      viewCount: viewCountErr ? `count error: ${viewCountErr.message}` : viewCount ?? null,
      returned: (data ?? []).length,
    },
  });
}

export async function GET() {
  return handler();
}

export async function POST() {
  return handler();
}