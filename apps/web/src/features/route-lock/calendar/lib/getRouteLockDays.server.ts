// RUN THIS
// Replace the entire file:
// apps/web/src/features/route-lock/calendar/lib/getRouteLockDays.server.ts

import { todayInNY, addDaysISO, eachDayISO, weekdayKey } from "@/features/route-lock/calendar/lib/fiscalMonth";

type Sb = any;

type DayRow = {
  date: string;

  quota_hours: number | null; // truth
  quota_routes: number | null; // derived for calendar (ceil(hours/8))

  scheduled_routes: number; // On (routes=tech-days)
  scheduled_techs: number;

  total_headcount: number; // active tech baseline
  util_pct: number | null;

  delta_forecast: number | null; // scheduled_routes - quota_routes

  has_sv: boolean; // V chip
  has_check_in: boolean; // C chip (Phase 2; always false for now)

  quota_units: number | null;
};

function int0(v: any): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function ceilRoutesFromHours(hours: number): number {
  return Math.ceil(hours / 8);
}

function safePct(num: number, den: number): number | null {
  if (!den) return null;
  const p = num / den;
  if (!Number.isFinite(p)) return null;
  return Math.round(p * 1000) / 10; // 1 decimal
}

type FiscalMonth = { fiscal_month_id: string; start_date: string; end_date: string; label?: string | null };

async function resolveCurrentFiscalMonth(sb: Sb, anchorISO: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id, start_date, end_date, label")
    .lte("start_date", anchorISO)
    .gte("end_date", anchorISO)
    .maybeSingle();

  if (error) return null;
  if (!data?.fiscal_month_id || !data?.start_date || !data?.end_date) return null;

  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date),
    end_date: String(data.end_date),
    label: (data.label as string | null) ?? null,
  };
}

export async function getRouteLockDaysForCurrentFiscalMonth(sb: Sb, pc_org_id: string) {
  const today = todayInNY();
  const fm = await resolveCurrentFiscalMonth(sb, today);
  if (!fm) {
    return { ok: false as const, error: "Could not resolve fiscal month (fiscal_month_dim)" };
  }

  const days = eachDayISO(fm.start_date, fm.end_date);

  // ---------- HEADCOUNT + TECH SET ----------
  const { data: memRows, error: memErr } = await sb.from("v_roster_current").select("person_id").eq("pc_org_id", pc_org_id);
  if (memErr) return { ok: false as const, error: `Could not load roster membership (v_roster_current): ${memErr.message}` };

  const membershipSet = new Set<string>((memRows ?? []).map((r: any) => String(r?.person_id ?? "").trim()).filter(Boolean));

  // ✅ Decouple calendar from master_roster_v (use the schedule-specific surface)
  const { data: rosterRows, error: rosterErr } = await sb
    .from("route_lock_roster_v")
    .select(
      [
        "assignment_id",
        "person_id",
        "full_name",
        "tech_id",
        "position_title",
        "start_date",
        "end_date",
        "assignment_active",
        "reports_to_assignment_id",
        "reports_to_person_id",
        "reports_to_full_name",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id);

  if (rosterErr) return { ok: false as const, error: `Could not load roster (route_lock_roster_v): ${rosterErr.message}` };

  const roster = (rosterRows ?? []) as any[];

  const roleText = (r: any) => String(r?.position_title ?? "").trim();
  const isSupervisorRow = (r: any) => /supervisor/i.test(roleText(r));
  const isTechnicianRow = (r: any) => {
    const t = roleText(r);
    if (/technician/i.test(t)) return true;
    return Boolean(String(r?.tech_id ?? "").trim()) && !isSupervisorRow(r);
  };

  const isPOLAReady = (r: any) => {
    const personOk = !!String(r.full_name ?? "").trim();

    const pid = String(r.person_id ?? "").trim();
    const orgOk = !!pid && membershipSet.has(pid);

    const leadershipOk =
      !!String(r.reports_to_assignment_id ?? "").trim() ||
      !!String(r.reports_to_person_id ?? "").trim() ||
      !!String(r.reports_to_full_name ?? "").trim();

    const assignmentIdOk = !!String(r.assignment_id ?? "").trim();
    const assignmentEnd = String(r.end_date ?? "").trim();
    const assignmentActive = !!r.assignment_active;
    const assignmentOk = assignmentIdOk && assignmentActive && !assignmentEnd;

    return personOk && orgOk && leadershipOk && assignmentOk;
  };

  const techAssignments = roster
    .filter((r) => isTechnicianRow(r) && isPOLAReady(r))
    .map((r) => String(r.assignment_id ?? "").trim())
    .filter(Boolean);

  const total_headcount = techAssignments.length;

  // ---------- SCHEDULE (ON) ----------
  // Optimization: only pull schedules for the assignments we actually care about (prevents timeouts).
  let schedules: any[] = [];

  if (techAssignments.length > 0) {
    const { data: scheduleRows, error: scheduleErr } = await sb
      .from("schedule_admin_v")
      .select("assignment_id,start_date,end_date,sun,mon,tue,wed,thu,fri,sat")
      .eq("pc_org_id", pc_org_id)
      .in("assignment_id", techAssignments)
      .lte("start_date", fm.end_date)
      .or(`end_date.is.null,end_date.gte.${fm.start_date}`);

    if (scheduleErr) return { ok: false as const, error: `Could not load schedules (schedule_admin_v): ${scheduleErr.message}` };
    schedules = (scheduleRows ?? []) as any[];
  }

  const byAssignment = new Map<string, any[]>();
  for (const s of schedules) {
    const aid = String(s.assignment_id ?? "").trim();
    if (!aid) continue;
    const arr = byAssignment.get(aid) ?? [];
    arr.push(s);
    byAssignment.set(aid, arr);
  }

  for (const [aid, arr] of byAssignment.entries()) {
    arr.sort((a, b) => String(b.start_date ?? "").localeCompare(String(a.start_date ?? "")));
    byAssignment.set(aid, arr);
  }

  function isOnForDay(s: any, iso: string): boolean {
    const k = weekdayKey(iso);
    return Boolean(s?.[k]);
  }

  function scheduleRowForDate(aid: string, iso: string): any | null {
    const arr = byAssignment.get(aid);
    if (!arr?.length) return null;
    for (const s of arr) {
      const start = String(s.start_date ?? "").trim();
      const end = String(s.end_date ?? "").trim();
      const covers = !!start && start <= iso && (!end || end >= iso);
      if (covers) return s;
    }
    return null;
  }

  const scheduledByDay = new Map<string, { techs: number; routes: number }>();
  for (const d of days) scheduledByDay.set(d, { techs: 0, routes: 0 });

  for (const aid of techAssignments) {
    for (const d of days) {
      const s = scheduleRowForDate(aid, d);
      const on = s ? isOnForDay(s, d) : true; // default-ON if missing schedule row
      if (!on) continue;
      const cur = scheduledByDay.get(d)!;
      cur.techs += 1;
      cur.routes += 1;
    }
  }

  // ---------- QUOTA (hours entered) ----------
  const { data: quotaRows, error: quotaErr } = await sb
    .from("quota_admin_v")
    .select("qh_sun,qh_mon,qh_tue,qh_wed,qh_thu,qh_fri,qh_sat")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", fm.fiscal_month_id);

  if (quotaErr) return { ok: false as const, error: `Could not load quota (quota_admin_v): ${quotaErr.message}` };

  const quota = (quotaRows ?? []) as any[];

  const qh = {
    sun: quota.reduce((a, r) => a + int0(r.qh_sun), 0),
    mon: quota.reduce((a, r) => a + int0(r.qh_mon), 0),
    tue: quota.reduce((a, r) => a + int0(r.qh_tue), 0),
    wed: quota.reduce((a, r) => a + int0(r.qh_wed), 0),
    thu: quota.reduce((a, r) => a + int0(r.qh_thu), 0),
    fri: quota.reduce((a, r) => a + int0(r.qh_fri), 0),
    sat: quota.reduce((a, r) => a + int0(r.qh_sat), 0),
  } as Record<string, number>;

  const quotaHoursByDay = new Map<string, number>();
  for (const d of days) {
    const k = weekdayKey(d);
    quotaHoursByDay.set(d, qh[k] ?? 0);
  }

  // ---------- SHIFT VALIDATION PRESENCE (14-day reality) ----------
  const svStart = today;
  const svEndExclusive = addDaysISO(today, 14);

  const { data: svRows, error: svErr } = await sb
    .from("shift_validation_import_v")
    .select("shift_date")
    .eq("pc_org_id", pc_org_id)
    .gte("shift_date", svStart)
    .lt("shift_date", svEndExclusive);

  if (svErr) return { ok: false as const, error: `Could not load shift validation (shift_validation_import_v): ${svErr.message}` };

  const svSet = new Set<string>((svRows ?? []).map((r: any) => String(r?.shift_date ?? "").slice(0, 10)).filter(Boolean));

  // ---------- BUILD FINAL DAYS ----------
  const out: DayRow[] = days.map((d) => {
    const sched = scheduledByDay.get(d)!;
    const quotaHours = quotaHoursByDay.get(d) ?? 0;

    const quotaRoutes = quotaHours ? ceilRoutesFromHours(quotaHours) : 0;

    const delta = quotaRoutes ? sched.routes - quotaRoutes : null;
    const util = safePct(sched.techs, total_headcount);

    return {
      date: d,
      quota_hours: quotaHours || null,
      quota_routes: quotaHours ? quotaRoutes : null,
      quota_units: quotaHours ? quotaHours * 12 : null,

      scheduled_routes: sched.routes,
      scheduled_techs: sched.techs,

      total_headcount,
      util_pct: util,

      delta_forecast: delta,

      has_sv: svSet.has(d),
      has_check_in: false,
    };
  });

  return {
    ok: true as const,
    fiscal: fm,
    days: out,
  };
}