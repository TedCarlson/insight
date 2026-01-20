import { createClient } from "@/app/(prod)/_shared/supabase";
import { RosterPageShell } from "@/features/roster/RosterPageShell";

export default async function LeadRosterPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
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

  return (
    <RosterPageShell
      surface="lead"
      rosterRows={data ?? []}
      rosterError={error?.message ?? null}
    />
  );
}
