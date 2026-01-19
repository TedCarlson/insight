// apps/web/src/app/(prod)/org/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MasterOverlay, safeOverlayTab } from "../_shared/MasterOverlay";
import { OrgContextSelector } from "./_shared/OrgContextSelector";
import { OrgRosterPanel } from "./_shared/OrgRosterPanel";
import { OrgPlanningPanel } from "./_shared/OrgPlanningPanel";

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = safeOverlayTab(sp?.tab);

  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user || userErr) redirect("/login");

  // Pull selected_pc_org_id from user_profile (persisted org context)
  const { data: profile, error: profileErr } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    // best-effort render
    console.error("OrgPage user_profile lookup error:", profileErr);
  }

  const selectedPcOrgId = profile?.selected_pc_org_id ?? null;

  // Resolve org name for label (best-effort)
  let pcOrgName: string | null = null;
  if (selectedPcOrgId) {
    const res = await supabase
      .from("pc_org_admin_v")
      .select("pc_org_name")
      .eq("pc_org_id", selectedPcOrgId)
      .maybeSingle();

    pcOrgName = (res.data as any)?.pc_org_name ?? null;
  }

  const scopeLabel = selectedPcOrgId
    ? `Manager scope (pc_org): ${pcOrgName ?? selectedPcOrgId}`
    : "Manager scope (pc_org): none selected";

  return (
    <MasterOverlay
      title="ITG → Insight"
      scopeLabel={scopeLabel}
      activeTab={tab}
      baseHref="/org"
      headerRight={<OrgContextSelector />}
    >
      {!selectedPcOrgId ? (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Select an org to view scoped roster/planning/metrics/wire.
        </p>
      ) : null}

      {tab === "roster" && selectedPcOrgId && (
        <OrgRosterPanel pcOrgId={selectedPcOrgId} />
      )}

      {tab === "roster" && !selectedPcOrgId && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Select an org to view roster.
        </p>
      )}

      {tab === "planning" && selectedPcOrgId && (
        <OrgPlanningPanel pcOrgId={selectedPcOrgId} />
      )}

      {tab === "planning" && !selectedPcOrgId && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Select an org to view planning.
        </p>
      )}

      {tab === "metrics" && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Metrics dimension (pc_org scoped) will load here next.
        </p>
      )}

    </MasterOverlay>
  );
}
