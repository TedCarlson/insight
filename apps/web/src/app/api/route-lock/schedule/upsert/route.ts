// apps/web/src/app/api/route-lock/schedule/upsert/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type DayFlags = Record<DayKey, boolean>;

type ScheduleWriteRow = {
  assignment_id: string;
  default_route_id?: string | null;
  days: DayFlags;
};

function asUuid(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

function asDate(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function intDefault(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return i > 0 ? i : fallback;
}

function bool(v: unknown): boolean {
  return v === true;
}

function normalizeDays(days: any): DayFlags {
  return {
    sun: bool(days?.sun),
    mon: bool(days?.mon),
    tue: bool(days?.tue),
    wed: bool(days?.wed),
    thu: bool(days?.thu),
    fri: bool(days?.fri),
    sat: bool(days?.sat),
  };
}

function deriveNumbers(days: DayFlags, hoursPerDay: number, unitsPerHour: number) {
  const h = {
    sun: days.sun ? hoursPerDay : 0,
    mon: days.mon ? hoursPerDay : 0,
    tue: days.tue ? hoursPerDay : 0,
    wed: days.wed ? hoursPerDay : 0,
    thu: days.thu ? hoursPerDay : 0,
    fri: days.fri ? hoursPerDay : 0,
    sat: days.sat ? hoursPerDay : 0,
  };

  const u = {
    sun: h.sun * unitsPerHour,
    mon: h.mon * unitsPerHour,
    tue: h.tue * unitsPerHour,
    wed: h.wed * unitsPerHour,
    thu: h.thu * unitsPerHour,
    fri: h.fri * unitsPerHour,
    sat: h.sat * unitsPerHour,
  };

  return { h, u };
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

    const start_date = asDate(body?.start_date) ?? new Date().toISOString().slice(0, 10);
    const hoursPerDay = intDefault(body?.hoursPerDay, 8);
    const unitsPerHour = intDefault(body?.unitsPerHour, 12);

    const rows = (body?.rows ?? []) as ScheduleWriteRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No rows provided" }, { status: 400 });
    }

    const clean = rows.map((r) => ({
      assignment_id: asUuid(r.assignment_id),
      default_route_id: r.default_route_id == null ? null : asUuid(r.default_route_id),
      days: normalizeDays(r.days),
    }));

    if (clean.some((r) => !r.assignment_id)) {
      return NextResponse.json({ ok: false, error: "Invalid assignment_id (must be UUID)" }, { status: 400 });
    }
    if (clean.some((r) => r.default_route_id === undefined)) {
      return NextResponse.json({ ok: false, error: "Invalid default_route_id (must be UUID or null)" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Validate assignment belongs to selected org (independent of schedule rows existing)
    const assignmentIds = Array.from(new Set(clean.map((r) => r.assignment_id!)));
    const { data: allowedAssignments, error: allowedErr } = await admin
      .from("assignment")
      .select("assignment_id")
      .eq("pc_org_id", guard.pc_org_id)
      .in("assignment_id", assignmentIds);

    if (allowedErr) return NextResponse.json({ ok: false, error: allowedErr.message }, { status: 500 });

    const allowedSet = new Set((allowedAssignments ?? []).map((x: any) => String(x.assignment_id)));
    const rejected = assignmentIds.filter((id) => !allowedSet.has(String(id)));
    if (rejected.length) {
      return NextResponse.json(
        { ok: false, error: "One or more assignments are not in your selected org", rejected_assignment_ids: rejected },
        { status: 403 }
      );
    }

    const saved_schedule_ids: string[] = [];

    // Rolling baseline per assignment:
    // - close any open row (end_date IS NULL) => end_date = start_date
    // - insert new row with end_date = NULL
    for (const r of clean) {
      const { h, u } = deriveNumbers(r.days, hoursPerDay, unitsPerHour);

      // Close any currently-open schedule row for this assignment
      const { error: closeErr } = await admin
        .from("schedule")
        .update({ end_date: start_date })
        .eq("assignment_id", r.assignment_id!)
        .is("end_date", null);

      if (closeErr) return NextResponse.json({ ok: false, error: closeErr.message }, { status: 500 });

      // Insert the new baseline row (open-ended)
      const insertPayload: any = {
        assignment_id: r.assignment_id!,
        schedule_name: `planning_week_${start_date}`,
        start_date,
        end_date: null,
        default_route_id: r.default_route_id ?? null,

        sun: r.days.sun,
        mon: r.days.mon,
        tue: r.days.tue,
        wed: r.days.wed,
        thu: r.days.thu,
        fri: r.days.fri,
        sat: r.days.sat,

        sch_hours_sun: h.sun,
        sch_hours_mon: h.mon,
        sch_hours_tue: h.tue,
        sch_hours_wed: h.wed,
        sch_hours_thu: h.thu,
        sch_hours_fri: h.fri,
        sch_hours_sat: h.sat,

        sch_units_sun: u.sun,
        sch_units_mon: u.mon,
        sch_units_tue: u.tue,
        sch_units_wed: u.wed,
        sch_units_thu: u.thu,
        sch_units_fri: u.fri,
        sch_units_sat: u.sat,
      };

      const { data: ins, error: insErr } = await admin
        .from("schedule")
        .insert(insertPayload)
        .select("schedule_id")
        .maybeSingle();

      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      if (ins?.schedule_id) saved_schedule_ids.push(String(ins.schedule_id));
    }

    // Evidence refresh
    const { data: refreshed, error: refErr } = await admin
      .from("schedule_admin_v")
      .select("*")
      .eq("pc_org_id", guard.pc_org_id)
      .in("assignment_id", assignmentIds)
      .order("start_date", { ascending: false });

    if (refErr) return NextResponse.json({ ok: false, error: refErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      saved_schedule_ids,
      refreshed: refreshed ?? [],
      debug: {
        selected_pc_org_id: guard.pc_org_id,
        auth_user_id: guard.auth_user_id,
        start_date,
        hoursPerDay,
        unitsPerHour,
        rows: clean.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e ?? "Unknown error") }, { status: 500 });
  }
}