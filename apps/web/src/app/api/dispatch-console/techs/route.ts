// apps/web/src/app/api/dispatch-console/techs/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireDispatchConsoleAccess } from "../_auth";

export const runtime = "nodejs";

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function GET(req: NextRequest) {
  const pc_org_id = req.nextUrl.searchParams.get("pc_org_id") ?? "";
  const shift_date = req.nextUrl.searchParams.get("shift_date") ?? "";

  if (!pc_org_id) {
    return NextResponse.json(
      { ok: false, error: "missing_pc_org_id" },
      { status: 400 }
    );
  }

  if (!shift_date || !isISODate(shift_date)) {
    return NextResponse.json(
      { ok: false, error: "invalid_shift_date" },
      { status: 400 }
    );
  }

  const authz = await requireDispatchConsoleAccess(req, pc_org_id);
  if (!authz.ok) {
    return NextResponse.json(
      { ok: false, error: authz.error },
      { status: authz.status }
    );
  }

  const admin = supabaseAdmin();

  /**
   * Ensure dispatch snapshot exists.
   * Repo pattern: seed from schedule before reads.
   */
  const seed = await admin.rpc("dispatch_day_seed_from_schedule", {
    p_pc_org_id: pc_org_id,
    p_shift_date: shift_date,
  });

  if (seed.error) {
    return NextResponse.json(
      { ok: false, error: "seed_failed", details: seed.error },
      { status: 400 }
    );
  }

  /**
   * Primary workforce surface
   * (matches UI WorkforceRow shape used in Dispatch Console)
   */
  const { data, error } = await admin
    .from("dispatch_day_tech")
    .select(
      `
      pc_org_id,
      shift_date,
      assignment_id,
      person_id,
      tech_id,
      affiliation_id,
      full_name,
      co_name,
      planned_route_id,
      planned_route_name,
      planned_start_time,
      planned_end_time,
      planned_hours,
      planned_units,
      sv_built,
      sv_route_id,
      sv_route_name,
      checked_in_at,
      schedule_as_of,
      sv_as_of,
      check_in_as_of
    `
    )
    .eq("pc_org_id", pc_org_id)
    .eq("shift_date", shift_date)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "dispatch_lookup_failed", details: error },
      { status: 400 }
    );
  }

  const rows = (data ?? []).map((r: any) => ({
    pc_org_id: r.pc_org_id,
    shift_date: r.shift_date,
    assignment_id: r.assignment_id ? String(r.assignment_id) : "",
    person_id: r.person_id ? String(r.person_id) : "",
    tech_id: r.tech_id ? String(r.tech_id) : "",
    affiliation_id: r.affiliation_id ?? null,

    full_name: r.full_name ?? "",
    co_name: r.co_name ?? null,

    planned_route_id: r.planned_route_id ?? null,
    planned_route_name: r.planned_route_name ?? null,
    planned_start_time: r.planned_start_time ?? null,
    planned_end_time: r.planned_end_time ?? null,
    planned_hours: r.planned_hours ?? null,
    planned_units: r.planned_units ?? null,

    sv_built: r.sv_built ?? null,
    sv_route_id: r.sv_route_id ?? null,
    sv_route_name: r.sv_route_name ?? null,

    checked_in_at: r.checked_in_at ?? null,

    schedule_as_of: r.schedule_as_of ?? null,
    sv_as_of: r.sv_as_of ?? null,
    check_in_as_of: r.check_in_as_of ?? null,
  }));

  return NextResponse.json(
    {
      ok: true,
      pc_org_id,
      shift_date,
      rows,
    },
    { status: 200 }
  );
}