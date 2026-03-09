import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { requireModule } from "@/shared/access/access";

export const runtime = "nodejs";

function hasApprovalAuthority(pass: any) {
  if (!pass) return false;

  if (pass.is_admin === true) return true;

  const roles = Array.isArray(pass.roles) ? pass.roles.map((v: any) => String(v).toLowerCase()) : [];
  const permissions = Array.isArray(pass.permissions)
    ? pass.permissions.map((v: any) => String(v).toLowerCase())
    : [];
  const grantKeys = Array.isArray(pass.permission_keys)
    ? pass.permission_keys.map((v: any) => String(v).toLowerCase())
    : [];

  const all = new Set([...roles, ...permissions, ...grantKeys]);

  if (all.has("owner")) return true;
  if (all.has("admin")) return true;
  if (all.has("manager")) return true;

  if (all.has("route_lock_manage")) return true;
  if (all.has("leadership_manage")) return true;
  if (all.has("schedule_exception_approve")) return true;
  if (all.has("exceptions_approve")) return true;

  return false;
}

async function resolveSelectedPcOrg(req: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) {
    return { ok: false as const, status: 401, error: "unauthorized", user: null, pass: null };
  }

  const admin = supabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    return { ok: false as const, status: 500, error: profileErr.message, user: null, pass: null };
  }

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) {
    return { ok: false as const, status: 409, error: "no selected org", user: null, pass: null };
  }

  try {
    const pass = await requireAccessPass(req, pc_org_id);
    requireModule(pass, "route_lock");

    return {
      ok: true as const,
      pc_org_id,
      user,
      pass,
    };
  } catch (err: any) {
    const status = Number(err?.status ?? 500);

    if (status === 401) {
      return { ok: false as const, status: 401, error: "unauthorized", user: null, pass: null };
    }
    if (status === 403) {
      return { ok: false as const, status: 403, error: "forbidden", user: null, pass: null };
    }
    if (status === 400) {
      return {
        ok: false as const,
        status: 400,
        error: String(err?.message ?? "invalid_pc_org_id"),
        user: null,
        pass: null,
      };
    }

    return { ok: false as const, status: 500, error: "access_error", user: null, pass: null };
  }
}

export async function POST(req: NextRequest) {
  const guard = await resolveSelectedPcOrg(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  if (!hasApprovalAuthority(guard.pass)) {
    return NextResponse.json({ ok: false, error: "approval_forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const schedule_exception_day_id = String(body?.schedule_exception_day_id ?? "").trim();
  const decision_notes =
    body?.decision_notes == null ? null : String(body.decision_notes).trim() || null;

  if (!schedule_exception_day_id) {
    return NextResponse.json({ ok: false, error: "missing schedule_exception_day_id" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: row, error: readErr } = await admin
    .from("schedule_exception_day")
    .select("schedule_exception_day_id, pc_org_id, shift_date")
    .eq("schedule_exception_day_id", schedule_exception_day_id)
    .eq("pc_org_id", guard.pc_org_id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "exception_not_found" }, { status: 404 });
  }

  const { error: updateErr } = await admin
    .from("schedule_exception_day")
    .update({
      approved: true,
      status: "APPROVED",
      approved_by: guard.user.id,
      decision_notes,
      decision_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("schedule_exception_day_id", schedule_exception_day_id)
    .eq("pc_org_id", guard.pc_org_id);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  const shift_date = String((row as any).shift_date ?? "");
  const { data: fm, error: fmErr } = await admin
    .from("fiscal_month_dim")
    .select("fiscal_month_id")
    .lte("start_date", shift_date)
    .gte("end_date", shift_date)
    .maybeSingle();

  if (fmErr) {
    return NextResponse.json({ ok: false, error: fmErr.message }, { status: 500 });
  }

  if (fm?.fiscal_month_id) {
    const { error: sweepErr } = await admin.rpc("route_lock_sweep_month", {
      p_pc_org_id: guard.pc_org_id,
      p_fiscal_month_id: fm.fiscal_month_id,
    });

    if (sweepErr) {
      return NextResponse.json(
        { ok: false, error: `approved_but_sweep_failed: ${sweepErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}