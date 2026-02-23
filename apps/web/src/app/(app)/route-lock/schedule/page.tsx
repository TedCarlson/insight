// RUN THIS
// Replace the entire file:
// apps/web/src/app/(app)/route-lock/schedule/page.tsx

// apps/web/src/app/(app)/route-lock/schedule/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/shared/data/supabase/server";

import { todayInNY } from "@/features/route-lock/calendar/lib/fiscalMonth";
import { ScheduleGridClient } from "@/features/route-lock/schedule/ScheduleGridClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { month?: string };
type Props = { searchParams?: Promise<SearchParams> };

type FiscalMonth = { fiscal_month_id: string; start_date: string; end_date: string; label: string | null };

type Technician = {
  assignment_id: string;
  tech_id: string;
  full_name: string;
  co_name: string | null;
  not_on_roster?: boolean;
};

type RouteRow = { route_id: string; route_name: string };

type ScheduleBaselineRow = {
  schedule_baseline_month_id?: string;
  assignment_id: string;
  tech_id: string;
  default_route_id: string | null;
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function resolveFiscalMonthForDate(sb: any, anchorISO: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .lte("start_date", anchorISO)
    .gte("end_date", anchorISO)
    .maybeSingle();

  if (error || !data?.fiscal_month_id) return null;
  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date),
    end_date: String(data.end_date),
    label: (data.label as string | null) ?? null,
  };
}

async function resolveNextFiscalMonth(sb: any, currentEndISO: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .gt("start_date", currentEndISO)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.fiscal_month_id) return null;
  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date),
    end_date: String(data.end_date),
    label: (data.label as string | null) ?? null,
  };
}

function MonthToggle({
  active,
  currentHref,
  nextHref,
  currentLabel,
  nextLabel,
}: {
  active: "current" | "next";
  currentHref: string;
  nextHref: string;
  currentLabel: string;
  nextLabel: string;
}) {
  return (
    <Card variant="subtle">
      <Toolbar
        left={
          <div className="min-w-0 flex items-center gap-2">
            <Link href="/route-lock" className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center">
              Back
            </Link>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Schedule</div>
              <div className="text-xs text-[var(--to-ink-muted)] truncate">
                Planning baseline • commit paints schedule_day_fact forward-only
              </div>
            </div>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Link
              href={currentHref}
              className={cls("to-btn h-8 px-3 text-xs", active === "current" ? "to-btn--primary" : "to-btn--secondary")}
            >
              Current • {currentLabel}
            </Link>
            <Link
              href={nextHref}
              className={cls("to-btn h-8 px-3 text-xs", active === "next" ? "to-btn--primary" : "to-btn--secondary")}
            >
              Next • {nextLabel}
            </Link>
          </div>
        }
      />
    </Card>
  );
}

export default async function RouteLockSchedulePage({ searchParams }: Props) {
  noStore();

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  const today = todayInNY();
  const fmCurrent = await resolveFiscalMonthForDate(sb, today);
  if (!fmCurrent) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">Could not resolve current fiscal month (fiscal_month_dim).</div>
        </Card>
      </PageShell>
    );
  }

  const fmNext = await resolveNextFiscalMonth(sb, fmCurrent.end_date);
  if (!fmNext) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">Could not resolve next fiscal month (fiscal_month_dim).</div>
        </Card>
      </PageShell>
    );
  }

  const sp = (await searchParams) ?? {};
  const monthMode = String(sp?.month ?? "current") === "next" ? "next" : "current";
  const activeFm = monthMode === "next" ? fmNext : fmCurrent;

  const currentHref = "/route-lock/schedule?month=current";
  const nextHref = "/route-lock/schedule?month=next";

  // Routes (dropdown)
  const { data: routeRows, error: routesErr } = await sb
    .from("route")
    .select("route_id,route_name")
    .eq("pc_org_id", pc_org_id)
    .order("route_name", { ascending: true });

  if (routesErr) {
    return (
      <PageShell>
        <MonthToggle
          active={monthMode}
          currentHref={currentHref}
          nextHref={nextHref}
          currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
          nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
        />
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{routesErr.message}</div>
        </Card>
      </PageShell>
    );
  }

  const routes = (routeRows ?? []) as RouteRow[];

  // Roster techs (DO NOT POLA-GATE schedule planning)
  // Planning must be possible even if leadership/membership data is incomplete.
  const { data: rosterRows, error: rosterErr } = await sb
    .from("route_lock_roster_v")
    .select("assignment_id,tech_id,full_name,co_name,assignment_active,end_date")
    .eq("pc_org_id", pc_org_id);

  if (rosterErr) {
    return (
      <PageShell>
        <MonthToggle
          active={monthMode}
          currentHref={currentHref}
          nextHref={nextHref}
          currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
          nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
        />
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{rosterErr.message}</div>
        </Card>
      </PageShell>
    );
  }

  // Build a lookup of ALL roster rows by assignment_id (active or not),
  // so we can label baseline-orphan rows with a name for cleanup.
  const rosterByAssignment: Record<
    string,
    { tech_id: string; full_name: string; co_name: string | null; assignment_active: boolean; end_date: string | null }
  > = {};

  for (const rr of rosterRows ?? []) {
    const assignment_id = String((rr as any)?.assignment_id ?? "").trim();
    if (!assignment_id) continue;

    rosterByAssignment[assignment_id] = {
      tech_id: String((rr as any)?.tech_id ?? "").trim(),
      full_name: String((rr as any)?.full_name ?? "").trim(),
      co_name: (rr as any)?.co_name == null ? null : String((rr as any)?.co_name),
      assignment_active: !!(rr as any)?.assignment_active,
      end_date: (rr as any)?.end_date == null ? null : String((rr as any)?.end_date),
    };
  }

  // Active roster techs for normal planning
  const activeRosterTechs: Technician[] = (rosterRows ?? [])
    .map((r: any) => ({
      assignment_id: String(r?.assignment_id ?? "").trim(),
      tech_id: String(r?.tech_id ?? "").trim(),
      full_name: String(r?.full_name ?? "").trim(),
      co_name: r?.co_name == null ? null : String(r.co_name),
      assignment_active: !!r?.assignment_active,
      end_date: r?.end_date == null ? null : String(r.end_date),
    }))
    .filter((r) => r.assignment_id && r.tech_id) // tech_id is the external truth key
    .filter((r) => r.assignment_active && !r.end_date)
    .map(({ assignment_active: _a, end_date: _e, ...rest }) => rest);

  const activeAssignmentSet = new Set(activeRosterTechs.map((t) => t.assignment_id));

  // Existing baselines for this fiscal month
  const { data: baselineRows, error: baselineErr } = await sb
    .from("schedule_baseline_month")
    .select("schedule_baseline_month_id,assignment_id,tech_id,default_route_id,sun,mon,tue,wed,thu,fri,sat")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_month_id", activeFm.fiscal_month_id)
    .eq("is_active", true);

  if (baselineErr) {
    return (
      <PageShell>
        <MonthToggle
          active={monthMode}
          currentHref={currentHref}
          nextHref={nextHref}
          currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
          nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
        />
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{baselineErr.message}</div>
        </Card>
      </PageShell>
    );
  }

  const scheduleByAssignment: Record<string, ScheduleBaselineRow> = {};
  const baselineOrphans: Technician[] = [];

  for (const r of (baselineRows ?? []) as any[]) {
    const assignment_id = String(r?.assignment_id ?? "").trim();
    if (!assignment_id) continue;

    const tech_id = String(r?.tech_id ?? "").trim();

    scheduleByAssignment[assignment_id] = {
      schedule_baseline_month_id: r?.schedule_baseline_month_id ? String(r.schedule_baseline_month_id) : undefined,
      assignment_id,
      tech_id,
      default_route_id: r?.default_route_id ? String(r.default_route_id) : null,
      sun: r?.sun ?? null,
      mon: r?.mon ?? null,
      tue: r?.tue ?? null,
      wed: r?.wed ?? null,
      thu: r?.thu ?? null,
      fri: r?.fri ?? null,
      sat: r?.sat ?? null,
    };

    // If there's a baseline row but the assignment is not an active roster row,
    // surface it so ops can delete it (and flag "NOT ON ROSTER").
    if (!activeAssignmentSet.has(assignment_id)) {
      const rr = rosterByAssignment[assignment_id];
      baselineOrphans.push({
        assignment_id,
        tech_id: tech_id || String(rr?.tech_id ?? "").trim(),
        full_name: String(rr?.full_name ?? "").trim() || "(Unknown)",
        co_name: rr?.co_name ?? null,
        not_on_roster: true,
      });
    }
  }

  // Final tech list: active roster + baseline orphans, dedup by assignment_id
  const mergedByAssignment: Record<string, Technician> = {};
  for (const t of activeRosterTechs) mergedByAssignment[t.assignment_id] = t;
  for (const t of baselineOrphans) {
    if (!mergedByAssignment[t.assignment_id]) mergedByAssignment[t.assignment_id] = t;
  }
  const techs = Object.values(mergedByAssignment).filter((t) => t.assignment_id && t.tech_id);

  return (
    <PageShell>
      <MonthToggle
        active={monthMode}
        currentHref={currentHref}
        nextHref={nextHref}
        currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
        nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
      />

      <ScheduleGridClient
        technicians={techs}
        routes={routes}
        scheduleByAssignment={scheduleByAssignment}
        fiscalMonthId={activeFm.fiscal_month_id}
        defaults={{ unitsPerHour: 12, hoursPerDay: 8 }}
      />
    </PageShell>
  );
}