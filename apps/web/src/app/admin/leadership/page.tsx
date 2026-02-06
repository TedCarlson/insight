import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";
import LeadershipEditor from "@/components/admin/LeadershipEditor";

export default async function AdminLeadershipPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Server-authoritative org: read from user_profile
  const { data: profile, error: profileErr } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Leadership</h1>
        <p className="mt-3 text-sm text-muted-foreground">Failed to read user_profile: {profileErr.message}</p>
      </div>
    );
  }

  const pc_org_id = profile?.selected_pc_org_id as string | null;
  if (!pc_org_id) {
    // You can change this to a nicer CTA later
    redirect("/home");
  }

  const { data: org, error: orgErr } = await supabase
    .from("pc_org")
    .select("pc_org_id, pc_org_name, region_id, division_id")
    .eq("pc_org_id", pc_org_id)
    .maybeSingle();

  if (orgErr || !org) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Leadership</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Failed to load pc_org for selected org: {orgErr?.message ?? "not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leadership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set leaders for this PC, its Region, and its Division. Leaders can be app users or person records (outside the roster).
        </p>
      </div>

      <LeadershipEditor
        pcOrgId={org.pc_org_id}
        pcOrgName={org.pc_org_name}
        regionId={org.region_id}
        divisionId={org.division_id}
      />
    </div>
  );
}