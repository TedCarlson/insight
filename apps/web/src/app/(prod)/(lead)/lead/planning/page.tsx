import Link from "next/link";
import { PlanningGrid } from "@/features/planning/PlanningGrid";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/lib/supabase/server";

const ROSTER_SELECT =
  "person_pc_org_id,person_id,pc_org_id,full_name,person_role,person_active,membership_status,membership_active,position_title,assignment_id" as const;

function parseDateOnlyUTC(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

function toISODateUTC(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function weekWindowUTC(base: Date) {
  const day = base.getUTCDay();
  const start = new Date(base.getTime() - day * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return { start: toISODateUTC(start), end: toISODateUTC(end) };
}

export default async function LeadPlanningPage(props: { searchParams?: Promise<any> }) {
  const sp = props.searchParams ? await props.searchParams : undefined;

  const scope = await requireSelectedPcOrgServer();

  if (!scope.ok) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-sm font-semibold">Planning</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          {scope.reason === "not_authenticated"
            ? "Not authenticated."
            : "No selected PC Org found on your profile (user_profile.selected_pc_org_id)."}
        </div>

        <div className="mt-4 text-sm">
          Temporary: legacy planning still lives under{" "}
          <Link href="/org" className="underline">
            /org
          </Link>
          .
        </div>
      </div>
    );
  }

  // Optional query override (useful for testing / admin links), but default is selected pc org.
  const pcOrgIdRaw = sp?.pc_org_id as string | string[] | undefined;
  const pcOrgIdFromQuery = Array.isArray(pcOrgIdRaw) ? pcOrgIdRaw[0] : pcOrgIdRaw;
  const pcOrgId = pcOrgIdFromQuery || scope.selected_pc_org_id;

  const startDateRaw = sp?.start_date as string | string[] | undefined;
  const startDate = Array.isArray(startDateRaw) ? startDateRaw[0] : startDateRaw;

  const base = startDate ? parseDateOnlyUTC(startDate) : null;
  const win = weekWindowUTC(base ?? new Date());
  const scheduleName = `planning_week_${win.start}`;

  const supabase = await supabaseServer();

  const rosterRes = await supabase
    .from("v_roster_active")
    .select(ROSTER_SELECT)
    .eq("pc_org_id", pcOrgId)
    .ilike("position_title", "%Technician%")
    .order("full_name", { ascending: true });

  if (rosterRes.error) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="text-sm font-semibold">Planning load failed</div>
        <div className="mt-1 text-sm opacity-90">{rosterRes.error.message}</div>
      </div>
    );
  }

  const rosterRows = (rosterRes.data ?? []) as any[];

  const assignmentIds = Array.from(
    new Set(rosterRows.map((r: any) => r.assignment_id).filter((id: any) => Boolean(id)))
  ) as string[];

  const scheduleSeeds =
    assignmentIds.length === 0
      ? []
      : (
          await supabase
            .from("schedule")
            .select("schedule_id,assignment_id,sun,mon,tue,wed,thu,fri,sat")
            .in("assignment_id", assignmentIds)
            .eq("start_date", win.start)
            .eq("schedule_name", scheduleName)
        ).data ?? [];

  return (
    <PlanningGrid
      pcOrgId={pcOrgId}
      rows={rosterRows as any[]}
      weekStart={win.start}
      weekEnd={win.end}
      scheduleName={scheduleName}
      scheduleSeeds={(scheduleSeeds ?? []) as any[]}
    />
  );
}
