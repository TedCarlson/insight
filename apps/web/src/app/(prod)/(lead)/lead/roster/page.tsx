//apps/web/src/app/%28prod%29/%28lead%29/lead/roster/page.tsx

import { RosterLeadPage } from "@/features/roster/RosterLeadPage";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/lib/supabase/server";

const ROSTER_SELECT =
  "person_pc_org_id,person_id,pc_org_id,full_name,person_role,person_active,membership_status,membership_active,position_title,assignment_id" as const;

const UNASSIGNED_SELECT =
  "person_id,full_name,emails,mobile,person_active,person_role" as const;

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

  return (
    <RosterLeadPage
      rosterRows={(rosterRes.data ?? []) as any}
      rosterError={rosterRes.error?.message ?? null}
      unassigned={(unassignedRes.data ?? []) as any}
      unassignedError={unassignedRes.error?.message ?? null}
    />
  );
}
