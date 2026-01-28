/**
 * Active roster helper utilities.
 *
 * Single source of truth for "active membership" is the DB view:
 *   public.v_roster_active  (filters on person_pc_org.active = true)
 *
 * All callers should scope by pc_org_id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveRosterRow = {
  pc_org_id: string;
  person_id: string;
};

type ActiveRosterResult = {
  rows: ActiveRosterRow[];
  personIds: Set<string>;
  byPersonId: Map<string, ActiveRosterRow>;
};

/**
 * Fetch full rows from v_roster_active for an org.
 * Fails closed (throws) if the view isn't readable or query fails.
 */
export async function fetchActiveRosterForOrg(
  supabase: SupabaseClient,
  pc_org_id: string
): Promise<ActiveRosterResult> {
  const oid = String(pc_org_id ?? "").trim();
  if (!oid) {
    throw new Error("fetchActiveRosterForOrg requires a valid pc_org_id");
  }

  const { data, error } = await supabase
    .from("v_roster_active")
    .select("pc_org_id, person_id")
    .eq("pc_org_id", oid);

  if (error) {
    // Fail closed – do not allow callers to "show all" if this read fails.
    throw new Error(
      `Could not load active roster membership (v_roster_active) for pc_org_id=${oid}: ${error.message}`
    );
  }

  const rows = (Array.isArray(data) ? data : []) as unknown as ActiveRosterRow[];

  const personIds = new Set<string>();
  const byPersonId = new Map<string, ActiveRosterRow>();

  for (const r of rows) {
    const pid = String((r as any)?.person_id ?? "").trim();
    if (!pid) continue;

    personIds.add(pid);
    byPersonId.set(pid, {
      pc_org_id: String((r as any)?.pc_org_id ?? "").trim(),
      person_id: pid,
    });
  }

  return { rows, personIds, byPersonId };
}

/**
 * Convenience wrapper – returns just a Set of active person_ids for an org.
 */
export async function fetchActiveRosterPersonIdSet(
  supabase: SupabaseClient,
  pc_org_id: string
): Promise<Set<string>> {
  const res = await fetchActiveRosterForOrg(supabase, pc_org_id);
  return res.personIds;
}

/**
 * Fetch a map of person_id -> pc_org_id for ACTIVE memberships across ANY org.
 *
 * Used for UI labelling (show current membership org) and for hard-blocking "Unassigned"
 * views from showing people who already have an active membership somewhere.
 *
 * If a person has multiple active memberships, the lexicographically-smallest pc_org_id
 * is returned for determinism.
 */
export async function fetchActiveMembershipOrgByPersonIds(
  supabase: SupabaseClient,
  personIds: Array<string | number>
): Promise<Map<string, string>> {
  const ids = (personIds ?? [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);

  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);

    const { data, error } = await supabase
      .from("v_roster_active")
      .select("person_id, pc_org_id")
      .in("person_id", chunk)
      .order("pc_org_id", { ascending: true });

    if (error) {
      throw new Error(`Could not load active membership map (v_roster_active): ${error.message}`);
    }

    const rows = (Array.isArray(data) ? data : []) as unknown as Array<{ person_id?: any; pc_org_id?: any }>;

    for (const r of rows) {
      const pid = String(r?.person_id ?? "").trim();
      const oid = String(r?.pc_org_id ?? "").trim();
      if (!pid || !oid) continue;

      // Deterministic: keep the smallest pc_org_id we see for that person.
      if (!out.has(pid) || oid < (out.get(pid) as string)) out.set(pid, oid);
    }
  }

  return out;
}
