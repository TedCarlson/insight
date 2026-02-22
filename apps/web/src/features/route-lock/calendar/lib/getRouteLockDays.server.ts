// RUN THIS
// Replace the entire file:
// apps/web/src/features/route-lock/calendar/lib/getRouteLockDays.server.ts

import { todayInNY, eachDayISO } from "@/features/route-lock/calendar/lib/fiscalMonth";

type Sb = any;

type DayRow = {
  date: string;

  quota_hours: number | null;
  quota_routes: number | null;
  quota_units: number | null;

  scheduled_routes: number;
  scheduled_techs: number;

  total_headcount: number;
  util_pct: number | null;

  delta_forecast: number | null;

  has_sv: boolean;
  has_check_in: boolean;
};

function ceilRoutesFromHours(hours: number): number {
  return Math.ceil(hours / 8);
}

function safePct(num: number, den: number): number | null {
  if (!den) return null;
  const p = num / den;
  if (!Number.isFinite(p)) return null;
  return Math.round(p * 1000) / 10;
}

type FiscalMonth = { fiscal_month_id: string; start_date: string; end_date: string; label?: string | null };

async function resolveFiscalMonthForDate(sb: Sb, anchorISO: string): Promise<FiscalMonth | null> {
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

async function resolveFiscalMonthById(sb: Sb, fiscal_month_id: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id, start_date, end_date, label")
    .eq("fiscal_month_id", fiscal_month_id)
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

async function computeHeadcount(sb: Sb, pc_org_id: string): Promise<number> {
  const { data: memRows, error: memErr } = await sb.from("v_roster_current").select("person_id").eq("pc_org_id", pc_org_id);
  if (memErr) throw new Error(`Could not load roster membership (v_roster_current): ${memErr.message}`);

  const membershipSet = new Set<string>((memRows ?? []).map((r: any) => String(r?.person_id ?? "").trim()).filter(Boolean));

  const { data: rosterRows, error: rosterErr } = await sb
    .from("route_lock_roster_v")
    .select(
      [
        "assignment_id",
        "person_id",
        "full_name",
        "tech_id",
        "position_title",
        "end_date",
        "assignment_active",
        "reports_to_assignment_id",
        "reports_to_person_id",
        "reports_to_full_name",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id);

  if (rosterErr) throw new Error(`Could not load roster (route_lock_roster_v): ${rosterErr.message}`);

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

  return techAssignments.length;
}

export async function getRouteLockDaysForFiscalMonth(sb: Sb, pc_org_id: string, fiscal_month_id: string) {
  const fm = await resolveFiscalMonthById(sb, fiscal_month_id);
  if (!fm) return { ok: false as const, error: "Could not resolve fiscal month (fiscal_month_dim by id)" };

  const days = eachDayISO(fm.start_date, fm.end_date);

  let total_headcount = 0;
  try {
    total_headcount = await computeHeadcount(sb, pc_org_id);
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message ?? "Could not compute headcount") };
  }

  // Schedule facts (one row per tech-day)
  const { data: schedRows, error: schedErr } = await sb
    .from("schedule_day_fact")
    .select("shift_date, tech_id")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", fm.fiscal_month_id);

  if (schedErr) return { ok: false as const, error: `Could not load schedule day facts (schedule_day_fact): ${schedErr.message}` };

  const scheduledByDay = new Map<string, { techs: number; routes: number }>();
  for (const d of days) scheduledByDay.set(d, { techs: 0, routes: 0 });

  for (const r of schedRows ?? []) {
    const iso = String(r?.shift_date ?? "").slice(0, 10);
    if (!iso) continue;
    const cur = scheduledByDay.get(iso);
    if (!cur) continue;
    cur.techs += 1;
    cur.routes += 1;
  }

  // Quota facts (many rows per day: 1 per route) -> MUST SUM by day
  const { data: quotaRows, error: quotaErr } = await sb
    .from("quota_day_fact")
    .select("shift_date, quota_hours, quota_units")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", fm.fiscal_month_id);

  if (quotaErr) return { ok: false as const, error: `Could not load quota day facts (quota_day_fact): ${quotaErr.message}` };

  const quotaByDay = new Map<string, { hours: number; units: number }>();
  for (const r of quotaRows ?? []) {
    const iso = String(r?.shift_date ?? "").slice(0, 10);
    if (!iso) continue;

    const addHours = Number(r?.quota_hours ?? 0) || 0;
    const addUnits = Number(r?.quota_units ?? 0) || 0;

    const cur = quotaByDay.get(iso) ?? { hours: 0, units: 0 };
    cur.hours += addHours;
    cur.units += addUnits;
    quotaByDay.set(iso, cur);
  }

  // Shift validation presence (many rows per day, presence is fine)
  const { data: svRows, error: svErr } = await sb
    .from("shift_validation_day_fact")
    .select("shift_date")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", fm.fiscal_month_id);

  if (svErr) return { ok: false as const, error: `Could not load shift validation day facts (shift_validation_day_fact): ${svErr.message}` };

  const svSet = new Set<string>((svRows ?? []).map((r: any) => String(r?.shift_date ?? "").slice(0, 10)).filter(Boolean));

  // Check-in presence
  const { data: ciRows, error: ciErr } = await sb
    .from("check_in_day_fact")
    .select("shift_date")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", fm.fiscal_month_id);

  if (ciErr) return { ok: false as const, error: `Could not load check-in day facts (check_in_day_fact): ${ciErr.message}` };

  const ciSet = new Set<string>((ciRows ?? []).map((r: any) => String(r?.shift_date ?? "").slice(0, 10)).filter(Boolean));

  const out: DayRow[] = days.map((d) => {
    const sched = scheduledByDay.get(d) ?? { techs: 0, routes: 0 };
    const q = quotaByDay.get(d) ?? { hours: 0, units: 0 };

    const quotaRoutes = q.hours > 0 ? ceilRoutesFromHours(q.hours) : 0;
    const delta = quotaRoutes > 0 ? sched.routes - quotaRoutes : null;
    const util = safePct(sched.techs, total_headcount);

    return {
      date: d,

      quota_hours: q.hours > 0 ? q.hours : null,
      quota_routes: q.hours > 0 ? quotaRoutes : null,
      quota_units: q.units > 0 ? q.units : null,

      scheduled_routes: sched.routes,
      scheduled_techs: sched.techs,

      total_headcount,
      util_pct: util,

      delta_forecast: delta,

      has_sv: svSet.has(d),
      has_check_in: ciSet.has(d),
    };
  });

  return { ok: true as const, fiscal: fm, days: out };
}

export async function getRouteLockDaysForCurrentFiscalMonth(sb: Sb, pc_org_id: string) {
  const today = todayInNY();
  const fm = await resolveFiscalMonthForDate(sb, today);
  if (!fm) return { ok: false as const, error: "Could not resolve fiscal month (fiscal_month_dim)" };

  return getRouteLockDaysForFiscalMonth(sb, pc_org_id, fm.fiscal_month_id);
}