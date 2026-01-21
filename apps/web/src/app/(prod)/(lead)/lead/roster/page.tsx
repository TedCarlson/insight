// apps/web/src/app/(prod)/(lead)/lead/roster/page.tsx

import { RosterLeadPage } from "@/features/roster/RosterLeadPage";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/lib/supabase/server";

const ROSTER_SELECT =
  "person_pc_org_id,person_id,pc_org_id,full_name,person_role,person_active,membership_status,membership_active,position_title,assignment_id" as const;

const UNASSIGNED_SELECT = "person_id,full_name,emails,mobile,person_active,person_role" as const;

function dateOnlyUTC(dt: Date) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Sunday-start week window (match Planning)
function weekWindowUTC(base: Date) {
  const b = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const day = b.getUTCDay(); // 0=Sun
  const start = new Date(b);
  start.setUTCDate(b.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: dateOnlyUTC(start), end: dateOnlyUTC(end) };
}

export default async function LeadRosterPage() {
  const scope = await requireSelectedPcOrgServer();

  if (!scope.ok) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-sm font-semibold">Roster</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          {scope.reason === "not_authenticated"
            ? "Not authenticated."
            : "No selected PC Org found on your profile (user_profile.selected_pc_org_id)."}
        </div>
      </div>
    );
  }

  const pcOrgId = scope.selected_pc_org_id;
  const supabase = await supabaseServer();

  const rosterRes = await supabase
    .from("v_roster_active")
    .select(ROSTER_SELECT)
    .eq("pc_org_id", pcOrgId)
    .order("full_name", { ascending: true });

  const unassignedRes = await supabase
    .from("v_people_unassigned")
    .select(UNASSIGNED_SELECT)
    .order("full_name", { ascending: true });

  // --- WEEK SCOPE + SEEDS (mirror Planning) ---
  const win = weekWindowUTC(new Date());
  const scheduleName = `planning_week_${win.start}`;

  const rosterRows = (rosterRes.data ?? []) as any[];

  const assignmentIds = rosterRows.map((r: any) => r.assignment_id).filter(Boolean);

  let scheduleSeeds: any[] = [];
  if (assignmentIds.length > 0) {
    const scheduleRes = await supabase
      .from("schedule")
      .select("schedule_id,assignment_id,sun,mon,tue,wed,thu,fri,sat")
      .in("assignment_id", assignmentIds)
      .eq("schedule_name", scheduleName);

    scheduleSeeds = scheduleRes.data ?? [];
  }

  return (
    <RosterLeadPage
      rosterRows={rosterRows as any}
      rosterError={rosterRes.error?.message ?? null}
      unassigned={(unassignedRes.data ?? []) as any}
      unassignedError={unassignedRes.error?.message ?? null}
      weekStart={win.start}
      weekEnd={win.end}
      scheduleName={scheduleName}
      scheduleSeeds={scheduleSeeds as any}
    />
  );
}
