// apps/web/src/app/(prod)/org/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MasterOverlay, safeOverlayTab } from "../_shared/MasterOverlay";
import { OrgContextSelector } from "./_shared/OrgContextSelector";
import { OrgRosterPanel } from "./_shared/OrgRosterPanel";
import { OrgPlanningPanel } from "./_shared/OrgPlanningPanel";

function SurfaceNotice(props: { title: string; message: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold text-[var(--to-ink)]">{props.title}</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">{props.message}</div>
    </div>
  );
}

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

  const noOrg = (
    <SurfaceNotice
      title="Select an org"
      message="Choose an org from the selector to view roster, planning, and metrics."
    />
  );

  const content = !selectedPcOrgId
    ? noOrg
    : tab === "roster"
    ? <OrgRosterPanel pcOrgId={selectedPcOrgId} />
    : tab === "planning"
    ? <OrgPlanningPanel pcOrgId={selectedPcOrgId} />
    : (
      <SurfaceNotice
        title="Metrics (coming soon)"
        message="Metrics dimension (pc_org scoped) will load here next."
      />
    );

  return (
    <MasterOverlay
      title="ITG → Insight"
      scopeLabel={scopeLabel}
      activeTab={tab}
      baseHref="/org"
      headerRight={<OrgContextSelector />}
    >
      {content}
    </MasterOverlay>
  );
}
