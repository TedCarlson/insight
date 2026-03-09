import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { requireModule } from "@/shared/access/access";

export const runtime = "nodejs";

async function resolveSelectedPcOrg(req: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const admin = supabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    return { ok: false as const, status: 500, error: profileErr.message };
  }

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) {
    return { ok: false as const, status: 409, error: "no selected org" };
  }

  try {
    const pass = await requireAccessPass(req, pc_org_id);
    requireModule(pass, "route_lock");

    return {
      ok: true as const,
      pc_org_id,
    };
  } catch (err: any) {
    const status = Number(err?.status ?? 500);

    if (status === 401) return { ok: false as const, status: 401, error: "unauthorized" };
    if (status === 403) return { ok: false as const, status: 403, error: "forbidden" };
    if (status === 400) {
      return {
        ok: false as const,
        status: 400,
        error: String(err?.message ?? "invalid_pc_org_id"),
      };
    }

    return { ok: false as const, status: 500, error: "access_error" };
  }
}

export async function GET(req: NextRequest) {
  const guard = await resolveSelectedPcOrg(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const from = String(req.nextUrl.searchParams.get("from") ?? "").trim();
  const to = String(req.nextUrl.searchParams.get("to") ?? "").trim();

  const admin = supabaseAdmin();

  let q = admin
    .from("schedule_exception_day")
    .select("*")
    .eq("pc_org_id", guard.pc_org_id)
    .order("shift_date", { ascending: true });

  if (from) q = q.gte("shift_date", from);
  if (to) q = q.lte("shift_date", to);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}