import Link from "next/link";
import { createClient } from "@/app/(prod)/_shared/supabase";
import { PlanningGrid } from "@/features/planning/PlanningGrid";

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

function isTechnicianTitle(positionTitle: unknown): boolean {
  return String(positionTitle ?? "").toLowerCase().includes("technician");
}

export default async function LeadPlanningPage(props: { searchParams?: Promise<any> }) {
  const sp = props.searchParams ? await props.searchParams : undefined;

  const pcOrgIdRaw = sp?.pc_org_id as string | string[] | undefined;
  const pcOrgId = Array.isArray(pcOrgIdRaw) ? pcOrgIdRaw[0] : pcOrgIdRaw;

  if (!pcOrgId) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-sm font-semibold">Planning</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Missing <code className="text-xs">pc_org_id</code>. Open Planning with a PC Org selected.
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

  const startDateRaw = sp?.start_date as string | string[] | undefined;
  const startDate = Array.isArray(startDateRaw) ? startDateRaw[0] : startDateRaw;

  const base = startDate ? parseDateOnlyUTC(startDate) : null;
  const win = weekWindowUTC(base ?? new Date());

  const scheduleName = `planning_week_${win.start}`;

  const supabase = createClient();

  const { data: rosterRows, error: rosterError } = await supabase
    .from("v_roster_active")
    .select(
      [
        "person_pc_org_id",
        "person_id",
        "pc_org_id",
        "full_name",
        "person_role",
        "person_active",
        "membership_status",
        "membership_active",
        "position_title",
        "assignment_id",
      ].join(",")
    )
    .eq("pc_org_id", pcOrgId)
    .order("full_name", { ascending: true });

  if (rosterError) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="text-sm font-semibold">Planning load failed</div>
        <div className="mt-1 text-sm opacity-90">{rosterError.message}</div>
      </div>
    );
  }

  const techRosterRows = (rosterRows ?? []).filter((r: any) => isTechnicianTitle(r.position_title));

  const assignmentIds = Array.from(
    new Set(techRosterRows.map((r: any) => r.assignment_id).filter((id: any) => Boolean(id)))
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
      rows={techRosterRows as any[]}
      weekStart={win.start}
      weekEnd={win.end}
      scheduleName={scheduleName}
      scheduleSeeds={(scheduleSeeds ?? []) as any[]}
    />
  );
}
