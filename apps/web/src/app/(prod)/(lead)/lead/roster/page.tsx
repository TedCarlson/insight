import { createClient } from "@/app/(prod)/_shared/supabase";
import { RosterLeadPage } from "@/features/roster/RosterLeadPage";

export default async function LeadRosterPage() {
  const supabase = await createClient();

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
    .order("full_name", { ascending: true });

  const { data: unassignedRows, error: unassignedError } = await supabase
    .from("v_people_unassigned")
    .select(["person_id", "full_name", "emails", "mobile", "person_active", "person_role"].join(","))
    .order("full_name", { ascending: true });

  return (
    <RosterLeadPage
      rosterRows={rosterRows ?? []}
      rosterError={rosterError?.message ?? null}
      unassigned={unassignedRows ?? []}
      unassignedError={unassignedError?.message ?? null}
    />
  );
}
