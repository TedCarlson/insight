// apps/web/src/app/(prod)/org/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { MasterOverlay, safeOverlayTab } from "../_shared/MasterOverlay";

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = safeOverlayTab(sp?.tab);


  // Server Supabase client (cookie-based session)
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* noop */
      },
    },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user || userErr) redirect("/login");

  // Derive assignment_id from auth metadata (same rule as your dropdowns.ts)
  const assignmentId =
    (user.user_metadata as any)?.assignment_id ||
    (user.app_metadata as any)?.assignment_id ||
    null;

  // Pull pc_org_name from assignment_admin_v
  let pcOrgName: string | null = null;

  if (assignmentId) {
    const res = await supabase
      .from("assignment_admin_v")
      .select("pc_org_name, pc_org_id")
      .eq("assignment_id", String(assignmentId))
      .maybeSingle();

    // Prefer name, fallback to id if name is null
    pcOrgName = (res.data as any)?.pc_org_name ?? (res.data as any)?.pc_org_id ?? null;
  }

  const scopeLabel = pcOrgName
    ? `Manager scope (pc_org): ${pcOrgName}`
    : "Manager scope (pc_org): unknown";

  return (
    <MasterOverlay title="Org" scopeLabel={scopeLabel} activeTab={tab} baseHref="/org">
      {tab === "roster" && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Roster dimension will live here (pc_org-scoped people/structure).
        </p>
      )}

      {tab === "planning" && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Planning dimension will live here (assignments/routes/schedules/quota framing).
        </p>
      )}

      {tab === "metrics" && (
        <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
          Metrics dimension will live here (quota-derived metrics visibility).
        </p>
      )}
    </MasterOverlay>
  );
}
