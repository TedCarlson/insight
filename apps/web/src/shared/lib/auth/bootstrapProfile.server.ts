// apps/web/src/lib/auth/bootstrapProfile.server.ts
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BootstrapResult = {
  ok: boolean;
  auth_user_id: string;
  status: string | null;
  person_id: string | null;
  selected_pc_org_id: string | null;
  created: boolean;
  hydrated: boolean;
  notes?: string[];
};

/**
 * Ensures the authenticated user has a user_profile row.
 *
 * - Inserts a minimal profile if missing (status=pending)
 * - Hydrates person_id/selected_pc_org_id/status from auth.user_metadata when present
 *   (typical for invite onboarding flows)
 *
 * This runs with service-role permissions but ONLY for the current session's user id.
 */
export async function bootstrapProfileServer(): Promise<BootstrapResult> {
  const supabase = await supabaseServer();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (!user || userErr) {
    return {
      ok: false,
      auth_user_id: "",
      status: null,
      person_id: null,
      selected_pc_org_id: null,
      created: false,
      hydrated: false,
      notes: ["unauthorized"],
    };
  }

  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  // 1) Read existing profile (service-role bypasses RLS)
  const existing = await admin
    .from("user_profile" as any)
    .select("auth_user_id, status, person_id, selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    return {
      ok: false,
      auth_user_id: user.id,
      status: null,
      person_id: null,
      selected_pc_org_id: null,
      created: false,
      hydrated: false,
      notes: ["profile_select_failed", existing.error.message],
    };
  }

  let created = false;
  let hydrated = false;

  // 2) Create if missing (insert-only)
  if (!existing.data) {
    const ins = await admin.from("user_profile" as any).upsert(
      {
        auth_user_id: user.id,
        status: "pending",
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "auth_user_id" as any, ignoreDuplicates: true }
    );

    if (ins.error) {
      return {
        ok: false,
        auth_user_id: user.id,
        status: null,
        person_id: null,
        selected_pc_org_id: null,
        created: false,
        hydrated: false,
        notes: ["profile_insert_failed", ins.error.message],
      };
    }
    created = true;
  }

  // 3) Re-read after potential insert
  const after = await admin
    .from("user_profile" as any)
    .select("auth_user_id, status, person_id, selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (after.error || !after.data) {
    return {
      ok: false,
      auth_user_id: user.id,
      status: null,
      person_id: null,
      selected_pc_org_id: null,
      created,
      hydrated: false,
      notes: ["profile_reread_failed", after.error?.message ?? "no_row"],
    };
  }

  const profile = after.data as any;

  // 4) Hydrate from auth metadata (invite flow)
  const meta = (user.user_metadata ?? {}) as any;
  const metaPersonId = typeof meta.person_id === "string" ? meta.person_id : null;
  const metaPcOrgId =
    typeof meta.pc_org_id === "string"
      ? meta.pc_org_id
      : typeof meta.selected_pc_org_id === "string"
        ? meta.selected_pc_org_id
        : null;
  const metaAssignmentId = typeof meta.assignment_id === "string" ? meta.assignment_id : null;

  const patch: Record<string, any> = { updated_at: nowIso };

  // Only fill blanks; do NOT overwrite an existing linkage.
  if (!profile.person_id && metaPersonId) patch.person_id = metaPersonId;
  if (!profile.selected_pc_org_id && metaPcOrgId) patch.selected_pc_org_id = metaPcOrgId;

  // If this user arrived via an invite (assignment_id present), we can activate them.
  // (Admin invite endpoint also sets status=active, but this catches any stragglers.)
  if (metaAssignmentId && profile.status !== "active") patch.status = "active";

  const hasMeaningfulPatch = Object.keys(patch).some((k) => k !== "updated_at");

  if (hasMeaningfulPatch) {
    const upd = await admin
      .from("user_profile" as any)
      .update(patch)
      .eq("auth_user_id", user.id);

    if (!upd.error) hydrated = true;
  }

  // 5) Final read (so callers get the truth)
  const final = await admin
    .from("user_profile" as any)
    .select("auth_user_id, status, person_id, selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const fp = (final.data as any) ?? profile;

  return {
    ok: true,
    auth_user_id: user.id,
    status: fp?.status ?? null,
    person_id: fp?.person_id ?? null,
    selected_pc_org_id: fp?.selected_pc_org_id ?? null,
    created,
    hydrated,
  };
}
