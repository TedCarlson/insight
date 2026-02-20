// RUN THIS
// Replace the entire file:
// apps/web/src/app/api/route-lock/schedule/upsert/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

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

function todayInNY(): string {
  // YYYY-MM-DD in America/New_York
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysISO(iso: string, days: number): string {
  // Treat ISO date as UTC midnight. We only care about YYYY-MM-DD.
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clampStartDateToToday(startDateISO: string): string {
  const today = todayInNY();
  return startDateISO < today ? today : startDateISO;
}

function cleanScheduleName(techId: string | null, fullName: string | null): string {
  const a = String(techId ?? "").trim();
  const b = String(fullName ?? "").trim();
  const combined = [a, b].filter(Boolean).join(" ").trim();
  // schedule_name is NOT NULL; give a stable fallback if roster text is missing
  const out = combined || "planning_week";
  return out.slice(0, 140);
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

  // Owner always allowed
  const { data: isOwner, error: ownerErr } = await sb.rpc("is_owner");
  if (ownerErr) return { ok: false as const, status: 403, error: "forbidden" };
  if (isOwner) return { ok: true as const, pc_org_id, auth_user_id: user.id };

  // Route Lock write gate (preferred) OR Roster Manage (legacy bridge)
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

    // IMPORTANT: Never allow planning writes to start before today (NY).
    // This prevents “overwriting” past facts and keeps history intact.
    const requestedStart = asDate(body?.start_date) ?? todayInNY();
    const start_date = clampStartDateToToday(requestedStart);
    const dayBefore = addDaysISO(start_date, -1);

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

    // Pull roster labels for schedule_name (tech_id + full_name), scoped to org.
    // We prefer master_roster_v because it already knows how to build full_name.
    const { data: rosterLabels, error: rosterErr } = await admin
      .from("master_roster_v")
      .select("assignment_id, tech_id, full_name")
      .eq("pc_org_id", guard.pc_org_id)
      .in("assignment_id", assignmentIds);

    if (rosterErr) return NextResponse.json({ ok: false, error: rosterErr.message }, { status: 500 });

    const labelByAssignment = new Map<string, { tech_id: string | null; full_name: string | null }>();
    for (const r of rosterLabels ?? []) {
      const aid = String((r as any).assignment_id ?? "").trim();
      if (!aid) continue;
      labelByAssignment.set(aid, {
        tech_id: (r as any).tech_id == null ? null : String((r as any).tech_id),
        full_name: (r as any).full_name == null ? null : String((r as any).full_name),
      });
    }

    const saved_schedule_ids: string[] = [];

    // Rolling baseline per assignment:
    // - If an open row already exists WITH THE SAME start_date => UPDATE it (no duplicate “covers today” rows)
    // - Else close open row => end_date = dayBeforeStart
    // - Insert new open row with end_date NULL
    for (const r of clean) {
      const labels = labelByAssignment.get(String(r.assignment_id)) ?? { tech_id: null, full_name: null };
      const schedule_name = cleanScheduleName(labels.tech_id, labels.full_name);

      // Find currently-open schedule row for this assignment (if any)
      const { data: openRow, error: openErr } = await admin
        .from("schedule")
        .select("schedule_id,start_date")
        .eq("assignment_id", r.assignment_id!)
        .is("end_date", null)
        .maybeSingle();

      if (openErr) return NextResponse.json({ ok: false, error: openErr.message }, { status: 500 });

      const openStart = String(openRow?.start_date ?? "").trim();
      const openId = String(openRow?.schedule_id ?? "").trim();

      // Payload: ONLY raw schedule facts (no derived hours/units).
      // Derived numbers belong in views / report surfaces, not stored here.
      const commonPayload: any = {
        schedule_name,
        default_route_id: r.default_route_id ?? null,

        sun: r.days.sun,
        mon: r.days.mon,
        tue: r.days.tue,
        wed: r.days.wed,
        thu: r.days.thu,
        fri: r.days.fri,
        sat: r.days.sat,
      };

      // If open row exists and already starts on the effective start_date, update it in-place
      if (openId && openStart === start_date) {
        const { data: updated, error: updErr } = await admin
          .from("schedule")
          .update(commonPayload)
          .eq("schedule_id", openId)
          .select("schedule_id")
          .maybeSingle();

        if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
        if (updated?.schedule_id) saved_schedule_ids.push(String(updated.schedule_id));
        continue;
      }

      // Otherwise close currently-open row (if any)
      if (openId) {
        // Closing a row is allowed even if it started in the past;
        // we are NOT overwriting its flags, just ending the range before the new baseline begins.
        const { error: closeErr } = await admin.from("schedule").update({ end_date: dayBefore }).eq("schedule_id", openId);
        if (closeErr) return NextResponse.json({ ok: false, error: closeErr.message }, { status: 500 });
      }

      // Insert new open row
      const { data: inserted, error: insErr } = await admin
        .from("schedule")
        .insert({
          assignment_id: r.assignment_id!,
          start_date,
          end_date: null,
          ...commonPayload,
        })
        .select("schedule_id")
        .maybeSingle();

      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      if (inserted?.schedule_id) saved_schedule_ids.push(String(inserted.schedule_id));
    }

    return NextResponse.json({
      ok: true,
      effective_start_date: start_date,
      saved_schedule_ids,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
  }
}