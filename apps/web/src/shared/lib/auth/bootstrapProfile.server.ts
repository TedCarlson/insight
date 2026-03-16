import "server-only";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

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

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeEmail(v: unknown): string | null {
  const s = asNonEmptyString(v);
  return s ? s.toLowerCase() : null;
}

/**
 * Ensures the authenticated user has a user_profile row.
 *
 * Behavior:
 * - inserts a minimal profile if missing
 * - hydrates person_id / selected_pc_org_id from auth metadata when present
 * - falls back to exact email match against existing person records when person_id is still blank
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
  const notes: string[] = [];

  const authEmail = normalizeEmail(user.email);

  // 1) Read existing profile
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

  // 2) Create if missing
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

  // 4) Hydrate from auth metadata first
  const meta = (user.user_metadata ?? {}) as any;
  const metaPersonId = asNonEmptyString(meta.person_id);
  const metaPcOrgId =
    asNonEmptyString(meta.pc_org_id) ?? asNonEmptyString(meta.selected_pc_org_id);
  const metaAssignmentId = asNonEmptyString(meta.assignment_id);

  let fallbackPersonId: string | null = null;
  let fallbackPcOrgId: string | null = null;

  // 5) Fallback: exact email match to person if person_id is still blank
  if (!profile.person_id && authEmail) {
    const personMatch = await admin
      .from("person" as any)
      .select("id, email")
      .eq("email", authEmail);

    if (personMatch.error) {
      notes.push("person_email_match_failed", personMatch.error.message);
    } else {
      const rows = Array.isArray(personMatch.data) ? personMatch.data : [];

      if (rows.length === 1) {
        fallbackPersonId = asNonEmptyString(rows[0]?.id);
        if (fallbackPersonId) {
          notes.push("person_linked_by_email");
        }
      } else if (rows.length > 1) {
        notes.push("person_email_match_ambiguous");
      } else {
        notes.push("person_email_match_none");
      }
    }
  }

  // 6) If we found a fallback person, try to derive org context
  const resolvedPersonId = profile.person_id ?? metaPersonId ?? fallbackPersonId;

  if (!profile.selected_pc_org_id && !metaPcOrgId && resolvedPersonId) {
    const membership = await admin
      .from("person_pc_org" as any)
      .select("pc_org_id")
      .eq("person_id", resolvedPersonId)
      .limit(1);

    if (membership.error) {
      notes.push("person_pc_org_lookup_failed", membership.error.message);
    } else {
      const row = Array.isArray(membership.data) ? membership.data[0] : null;
      fallbackPcOrgId = asNonEmptyString(row?.pc_org_id);
      if (fallbackPcOrgId) {
        notes.push("pc_org_derived_from_person");
      }
    }
  }

  // 7) Build patch without overwriting existing linkage
  const patch: Record<string, any> = { updated_at: nowIso };

  if (!profile.person_id) {
    const chosenPersonId = metaPersonId ?? fallbackPersonId;
    if (chosenPersonId) patch.person_id = chosenPersonId;
  }

  if (!profile.selected_pc_org_id) {
    const chosenPcOrgId = metaPcOrgId ?? fallbackPcOrgId;
    if (chosenPcOrgId) patch.selected_pc_org_id = chosenPcOrgId;
  }

  // Activate invited users once linkage context is present.
  if (
    profile.status !== "active" &&
    (metaAssignmentId || metaPersonId || fallbackPersonId)
  ) {
    patch.status = "active";
  }

  const hasMeaningfulPatch = Object.keys(patch).some((k) => k !== "updated_at");

  if (hasMeaningfulPatch) {
    const upd = await admin
      .from("user_profile" as any)
      .update(patch)
      .eq("auth_user_id", user.id);

    if (upd.error) {
      notes.push("profile_update_failed", upd.error.message);
    } else {
      hydrated = true;
    }
  }

  // 8) Final read
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
    notes,
  };
}