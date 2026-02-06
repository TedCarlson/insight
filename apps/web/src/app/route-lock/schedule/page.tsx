// apps/web/src/app/route-lock/schedule/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import { ScheduleGridClient } from "@/features/route-lock/schedule/ScheduleGridClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RosterRow = {
  assignment_id: string | null;
  person_id: string | null;
  full_name: string | null;
  tech_id: string | null;
  position_title: string | null;

  end_date: string | null;
  assignment_active: boolean | null;

  reports_to_assignment_id: string | null;
  reports_to_person_id: string | null;
  reports_to_full_name: string | null;

  co_name: string | null;
};

type ScheduleRow = {
  schedule_id: string;
  assignment_id: string;
  start_date: string;
  end_date: string | null;
  default_route_id: string | null;

  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

type RouteRow = { route_id: string; route_name: string };

type QuotaRow = {
  route_id: string;
  route_name: string | null;
  fiscal_month_label: string | null;
  fiscal_month_start_date: string | null;
  fiscal_month_end_date: string | null;
  qt_hours: number | null;
  qt_units: number | null;

  qh_sun: number;
  qh_mon: number;
  qh_tue: number;
  qh_wed: number;
  qh_thu: number;
  qh_fri: number;
  qh_sat: number;

  qu_sun: number | null;
  qu_mon: number | null;
  qu_tue: number | null;
  qu_wed: number | null;
  qu_thu: number | null;
  qu_fri: number | null;
  qu_sat: number | null;
};

function roleText(r: any): string {
  return String(r?.position_title ?? "").trim();
}

function isSupervisorRow(r: any): boolean {
  return /supervisor/i.test(roleText(r));
}

function isTechnicianRow(r: any): boolean {
  const t = roleText(r);
  if (/technician/i.test(t)) return true;
  return Boolean(String(r?.tech_id ?? "").trim()) && !isSupervisorRow(r);
}

function isPOLAReady(r: RosterRow, membershipSet: Set<string>): boolean {
  // P
  const personOk = !!String(r.full_name ?? "").trim();

  // O (membership)
  const pid = String(r.person_id ?? "").trim();
  const orgOk = !!pid && membershipSet.has(pid);

  // L (has leader)
  const leadershipOk =
    !!r.reports_to_assignment_id ||
    !!r.reports_to_person_id ||
    !!String(r.reports_to_full_name ?? "").trim();

  // A (active assignment)
  const assignmentIdOk = !!String(r.assignment_id ?? "").trim();
  const assignmentEnd = String(r.end_date ?? "").trim();
  const assignmentActive = !!r.assignment_active;
  const assignmentOk = assignmentIdOk && assignmentActive && !assignmentEnd;

  return personOk && orgOk && leadershipOk && assignmentOk;
}

function RouteLockBackHeader() {
  return (
    <Card variant="subtle">
      <Toolbar
        left={
          <div className="min-w-0 flex items-center gap-2">
            <Link
              href="/route-lock"
              className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
            >
              Back
            </Link>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Schedule</div>
              <div className="text-xs text-[var(--to-ink-muted)] truncate">Route Lock • Schedule setup</div>
            </div>
          </div>
        }
      />
    </Card>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <PageShell>
      <RouteLockBackHeader />
      <Card>
        <div className="text-sm text-[var(--to-warning)]">{message}</div>
      </Card>
    </PageShell>
  );
}

function todayInNY(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function RouteLockSchedulePage() {
  noStore();
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  // Membership set for "O"
  const { data: memRows, error: memErr } = await sb
    .from("v_roster_current")
    .select("person_id")
    .eq("pc_org_id", pc_org_id);

  if (memErr) {
    return <ErrorShell message={`Could not load roster membership (v_roster_current): ${memErr.message}`} />;
  }

  const membershipSet = new Set<string>(
    (memRows ?? [])
      .map((r: any) => String(r?.person_id ?? "").trim())
      .filter(Boolean)
  );

  // Roster import (include co_name for affiliation display/search)
  const { data: rosterRows, error: rosterErr } = await sb
    .from("master_roster_v")
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
        "co_name",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id)
    // Default sort by tech_id (matches your requirement)
    .order("tech_id", { ascending: true })
    .order("full_name", { ascending: true });

  if (rosterErr) {
    return <ErrorShell message={`Could not load roster (master_roster_v): ${rosterErr.message}`} />;
  }

  const roster = (rosterRows ?? []) as unknown as RosterRow[];

  const technicians = roster
    .filter((r) => isTechnicianRow(r) && isPOLAReady(r, membershipSet))
    .map((r) => ({
      assignment_id: String(r.assignment_id ?? ""),
      tech_id: String(r.tech_id ?? ""),
      full_name: String(r.full_name ?? ""),
      co_name: String(r.co_name ?? "").trim() || null,
    }))
    .filter((r) => r.assignment_id && r.tech_id && r.full_name);

  // Routes surface
  const { data: routeRows, error: routeErr } = await sb
    .from("route_admin_v")
    .select("route_id, route_name")
    .eq("pc_org_id", pc_org_id)
    .order("route_name", { ascending: true });

  if (routeErr) {
    return <ErrorShell message={`Could not load routes (route_admin_v): ${routeErr.message}`} />;
  }

  const routes = (routeRows ?? []) as unknown as RouteRow[];

  // Schedule surface (existing schedule rows)
  const { data: scheduleRows, error: scheduleErr } = await sb
    .from("schedule_admin_v")
    .select(
      [
        "schedule_id",
        "assignment_id",
        "start_date",
        "end_date",
        "default_route_id",
        "sun",
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id)
    .order("start_date", { ascending: false })
    .order("end_date", { ascending: false, nullsFirst: true })
    .order("schedule_id", { ascending: false });

  if (scheduleErr) {
    return <ErrorShell message={`Could not load schedules (schedule_admin_v): ${scheduleErr.message}`} />;
  }

  const schedules = (scheduleRows ?? []) as unknown as ScheduleRow[];

  // Pick the schedule row that is in-effect "today":
  // start_date <= today AND (end_date IS NULL OR end_date >= today).
  // If none exists for an assignment, we intentionally leave it missing so the client can fallback to default-ON.
  const today = todayInNY();
  const scheduleByAssignment = new Map<string, ScheduleRow>();

  for (const s of schedules) {
    const aid = String(s.assignment_id ?? "").trim();
    if (!aid || scheduleByAssignment.has(aid)) continue;

    const start = String(s.start_date ?? "").trim();
    const end = String(s.end_date ?? "").trim();

    const coversToday =
      !!start &&
      start <= today &&
      (!end || end >= today);

    if (coversToday) scheduleByAssignment.set(aid, s);
  }

  // Quota rollup totals for current fiscal month (existing behavior)
  const { data: quotaRows, error: quotaErr } = await sb
    .from("quota_admin_v")
    .select(
      [
        "route_id",
        "route_name",
        "fiscal_month_label",
        "fiscal_month_start_date",
        "fiscal_month_end_date",
        "qt_hours",
        "qt_units",
        "qh_sun",
        "qh_mon",
        "qh_tue",
        "qh_wed",
        "qh_thu",
        "qh_fri",
        "qh_sat",
        "qu_sun",
        "qu_mon",
        "qu_tue",
        "qu_wed",
        "qu_thu",
        "qu_fri",
        "qu_sat",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id)
    .lte("fiscal_month_start_date", today)
    .gte("fiscal_month_end_date", today);

  // If quota fails, still render schedule editor (quota banner can be empty)
  const quota = (quotaRows ?? []) as unknown as QuotaRow[];

  const quotaLabel = String(quota?.[0]?.fiscal_month_label ?? "").trim();
  const totalHours = quota.reduce((acc, r) => acc + (Number(r.qt_hours ?? 0) || 0), 0);
  const totalUnits = quota.reduce((acc, r) => acc + (Number(r.qt_units ?? 0) || 0), 0);

  return (
    <PageShell>
      <RouteLockBackHeader />

      <Card>
        <div className="text-sm font-medium">{quotaLabel ? `${quotaLabel} · Quota totals` : "Quota totals"}</div>
        <div className="text-xs text-[var(--to-ink-muted)]">
          Total Hours: {Math.round(totalHours)} · Total Units: {Math.round(totalUnits)}
          {quotaErr ? <span className="ml-2 text-[var(--to-warning)]">(quota unavailable)</span> : null}
        </div>
      </Card>

      <ScheduleGridClient
        key={`${pc_org_id}-${today}`}
        technicians={technicians}
        routes={routes}
        scheduleByAssignment={Object.fromEntries(scheduleByAssignment.entries())}
        defaults={{ unitsPerHour: 12, hoursPerDay: 8 }}
      />
    </PageShell>
  );
}