// apps/web/src/app/api/route-lock/quota/upsert/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type QuotaUpsertRow = {
  quota_id?: string;
  route_id: string;
  fiscal_month_id: string;
  qh_sun: number;
  qh_mon: number;
  qh_tue: number;
  qh_wed: number;
  qh_thu: number;
  qh_fri: number;
  qh_sat: number;
};

function asUuid(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

function int0(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

async function guardSelectedOrgRosterManage() {
  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) return { ok: false as const, status: 401, error: "unauthorized" };

  const { data: profile, error: profErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profErr) return { ok: false as const, status: 500, error: profErr.message };

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) return { ok: false as const, status: 409, error: "no selected org" };

  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
  const { data: allowed, error: permErr } = await apiClient.rpc("has_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_key: "roster_manage",
  });

  if (permErr || !allowed) return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, pc_org_id, auth_user_id: user.id };
}

export async function POST(req: Request) {
  try {
    const guard = await guardSelectedOrgRosterManage();
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    const body = await req.json().catch(() => null);
    const rows = (body?.rows ?? []) as QuotaUpsertRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No rows provided" }, { status: 400 });
    }

    const clean = rows.map((r) => ({
      pc_org_id: guard.pc_org_id,
      route_id: asUuid(r.route_id),
      fiscal_month_id: asUuid(r.fiscal_month_id),
      qh_sun: int0(r.qh_sun),
      qh_mon: int0(r.qh_mon),
      qh_tue: int0(r.qh_tue),
      qh_wed: int0(r.qh_wed),
      qh_thu: int0(r.qh_thu),
      qh_fri: int0(r.qh_fri),
      qh_sat: int0(r.qh_sat),
    }));

    if (clean.some((r) => !r.route_id || !r.fiscal_month_id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid route_id or fiscal_month_id (must be UUIDs)" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Verify routes belong to selected org
    const routeIds = Array.from(new Set(clean.map((r) => r.route_id!)));
    const { data: allowedRoutes, error: routesErr } = await admin
      .from("route")
      .select("route_id")
      .eq("pc_org_id", guard.pc_org_id)
      .in("route_id", routeIds);

    if (routesErr) return NextResponse.json({ ok: false, error: routesErr.message }, { status: 500 });

    const allowedSet = new Set((allowedRoutes ?? []).map((x: any) => String(x.route_id)));
    const rejected = routeIds.filter((id) => !allowedSet.has(String(id)));
    if (rejected.length) {
      return NextResponse.json(
        { ok: false, error: "One or more routes are not in your selected org", rejected_route_ids: rejected },
        { status: 403 }
      );
    }

    // Manual upsert: select existing quota_id for (pc_org_id, route_id, fiscal_month_id), then update/insert.
    const saved: any[] = [];

    for (const r of clean) {
      const { data: existing, error: findErr } = await admin
        .from("quota")
        .select("quota_id")
        .eq("pc_org_id", guard.pc_org_id)
        .eq("route_id", r.route_id!)
        .eq("fiscal_month_id", r.fiscal_month_id!)
        .maybeSingle();

      if (findErr) {
        return NextResponse.json(
          { ok: false, error: "Failed to check existing quota row", details: findErr.message },
          { status: 500 }
        );
      }

      if (existing?.quota_id) {
        const { data: upd, error: updErr } = await admin
          .from("quota")
          .update({
            qh_sun: r.qh_sun,
            qh_mon: r.qh_mon,
            qh_tue: r.qh_tue,
            qh_wed: r.qh_wed,
            qh_thu: r.qh_thu,
            qh_fri: r.qh_fri,
            qh_sat: r.qh_sat,
          })
          .eq("quota_id", existing.quota_id)
          .select("quota_id, pc_org_id, route_id, fiscal_month_id")
          .maybeSingle();

        if (updErr) {
          return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
        }
        saved.push(upd);
      } else {
        const { data: ins, error: insErr } = await admin
          .from("quota")
          .insert({
            pc_org_id: guard.pc_org_id,
            route_id: r.route_id!,
            fiscal_month_id: r.fiscal_month_id!,
            qh_sun: r.qh_sun,
            qh_mon: r.qh_mon,
            qh_tue: r.qh_tue,
            qh_wed: r.qh_wed,
            qh_thu: r.qh_thu,
            qh_fri: r.qh_fri,
            qh_sat: r.qh_sat,
          })
          .select("quota_id, pc_org_id, route_id, fiscal_month_id")
          .maybeSingle();

        if (insErr) {
          return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
        }
        saved.push(ins);
      }
    }

    return NextResponse.json({
      ok: true,
      saved,
      debug: { selected_pc_org_id: guard.pc_org_id, auth_user_id: guard.auth_user_id, rows: clean.length },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e ?? "Unknown error") }, { status: 500 });
  }
}