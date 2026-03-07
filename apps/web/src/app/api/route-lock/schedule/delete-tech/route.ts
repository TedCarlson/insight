// RUN THIS
// Replace the entire file:
// apps/web/src/app/api/route-lock/schedule/delete-tech/route.ts

import { NextResponse } from "next/server";

import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function asUuid(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

async function guardSelectedOrgRouteLockManage() {
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

  // owner is always allowed
  const { data: isOwner, error: ownerErr } = await sb.rpc("is_owner");
  if (ownerErr) return { ok: false as const, status: 403, error: "forbidden" };
  if (isOwner) return { ok: true as const, pc_org_id, auth_user_id: user.id };

  // permission gate (route_lock_manage preferred; roster_manage allowed)
  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
  const { data: allowed, error: permErr } = await apiClient.rpc("has_any_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_keys: ["route_lock_manage", "roster_manage"],
  });

  if (permErr || !allowed) return { ok: false as const, status: 403, error: "forbidden" };

  return { ok: true as const, pc_org_id, auth_user_id: user.id };
}

export async function POST(req: Request) {
  try {
    const guard = await guardSelectedOrgRouteLockManage();
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    const body = await req.json().catch(() => null);

    const fiscal_month_id = asUuid(body?.fiscal_month_id);
    const tech_id = String(body?.tech_id ?? "").trim();

    if (!fiscal_month_id) {
      return NextResponse.json({ ok: false, error: "Missing/invalid fiscal_month_id (UUID)" }, { status: 400 });
    }
    if (!tech_id) {
      return NextResponse.json({ ok: false, error: "Missing tech_id" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Resolve the selected fiscal month start_date
    const { data: fm, error: fmErr } = await admin
      .from("fiscal_month_dim")
      .select("start_date")
      .eq("fiscal_month_id", fiscal_month_id)
      .maybeSingle();

    if (fmErr) return NextResponse.json({ ok: false, error: fmErr.message }, { status: 500 });

    const start_date = String(fm?.start_date ?? "").trim();
    if (!start_date) return NextResponse.json({ ok: false, error: "fiscal_month_dim not found" }, { status: 404 });

    // Affect selected month + all future months by start_date
    const { data: months, error: monthsErr } = await admin
      .from("fiscal_month_dim")
      .select("fiscal_month_id,start_date")
      .gte("start_date", start_date)
      .order("start_date", { ascending: true });

    if (monthsErr) return NextResponse.json({ ok: false, error: monthsErr.message }, { status: 500 });

    const monthIds = (months ?? []).map((m: any) => String(m.fiscal_month_id)).filter(Boolean);
    if (monthIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No fiscal months resolved from start_date" }, { status: 500 });
    }

    // 1) Remove baselines (present + future months)
    const { error: delBaseErr, count: deleted_baselines } = await admin
      .from("schedule_baseline_month")
      .delete({ count: "exact" })
      .eq("pc_org_id", guard.pc_org_id)
      .eq("tech_id", tech_id)
      .in("fiscal_month_id", monthIds);

    if (delBaseErr) return NextResponse.json({ ok: false, error: delBaseErr.message }, { status: 500 });

    // 2) Remove future exceptions only (do not rewrite past)
    const todayISO = new Date().toISOString().slice(0, 10);
    const { error: delExErr, count: deleted_exceptions } = await admin
      .from("schedule_exception_day")
      .delete({ count: "exact" })
      .eq("pc_org_id", guard.pc_org_id)
      .eq("tech_id", tech_id)
      .gte("shift_date", todayISO);

    if (delExErr) return NextResponse.json({ ok: false, error: delExErr.message }, { status: 500 });

    // 3) Repaint day facts: selected month + next month (since UI supports current/next)
    const sweeps: any[] = [];

    const { data: sweep1, error: sweepErr1 } = await admin.rpc("schedule_sweep_month", {
      p_pc_org_id: guard.pc_org_id,
      p_fiscal_month_id: fiscal_month_id,
    });
    if (sweepErr1) return NextResponse.json({ ok: false, error: sweepErr1.message }, { status: 500 });
    sweeps.push({ fiscal_month_id, sweep: sweep1 ?? null });

    const nextMonthId = monthIds.length >= 2 ? monthIds[1] : null;
    if (nextMonthId) {
      const { data: sweep2, error: sweepErr2 } = await admin.rpc("schedule_sweep_month", {
        p_pc_org_id: guard.pc_org_id,
        p_fiscal_month_id: nextMonthId,
      });
      if (sweepErr2) return NextResponse.json({ ok: false, error: sweepErr2.message }, { status: 500 });
      sweeps.push({ fiscal_month_id: nextMonthId, sweep: sweep2 ?? null });
    }

    return NextResponse.json({
      ok: true,
      pc_org_id: guard.pc_org_id,
      tech_id,
      fiscal_month_id,
      months_affected: monthIds.length,
      deleted_baselines: deleted_baselines ?? 0,
      deleted_exceptions: deleted_exceptions ?? 0,
      sweeps,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? "unknown error") }, { status: 500 });
  }
}