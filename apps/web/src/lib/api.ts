// apps/web/src/lib/api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: string | null;
  hint?: string | null;
};

export type UUID = string;
export type IsoDateString = string;

/**
 * These are "deterministic read models":
 * - We strongly type the keys we *actually* use in UI.
 * - We keep an index signature so backend can evolve without breaking the app.
 */

export type PcOrgChoice = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  org_name?: string | null;
  name?: string | null;
  [k: string]: any;
};

export type PcOrgAdminMeta = {
  pc_org_id?: UUID;
  mso_name?: string | null;
  division_name?: string | null;
  region_name?: string | null;
  [k: string]: any;
};

export type PermissionDefRow = {
  permission_key: string;
  description?: string | null;
  created_at?: string | null;
  [k: string]: any;
};

export type PcOrgPermissionGrantRow = {
  pc_org_id?: UUID;
  auth_user_id?: UUID;
  permission_key?: string;
  expires_at?: IsoDateString | null;
  notes?: string | null;
  created_at?: IsoDateString | null;
  created_by?: UUID | null;
  [k: string]: any;
};


export type PcOrgEligibilityRow = {
  pc_org_id?: UUID;
  [k: string]: any;
};

export type PersonRow = {
  person_id?: UUID;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

/** assignment table (public.assignment) */
export type AssignmentRow = {
  assignment_id: UUID;
  person_id: UUID;
  pc_org_id: UUID;
  tech_id?: string | null;
  start_date: string; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  position_title?: string | null;
  active?: boolean | null;

  [k: string]: any;
};

/** person_pc_org table (public.person_pc_org) */
export type PersonPcOrgRow = {
  person_pc_org_id: UUID;
  person_id: UUID;
  pc_org_id: UUID;
  status: string;
  start_date?: string | null; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;

  [k: string]: any;
};


/** assignment_reporting table (public.assignment_reporting) */
export type AssignmentReportingRow = {
  assignment_reporting_id: UUID;
  child_assignment_id: UUID;
  parent_assignment_id: UUID;
  start_date: string; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  created_at?: string | null;
  created_by?: UUID | null;
  updated_at?: string | null;
  updated_by?: UUID | null;
  [k: string]: any;
};

/** roster_current "thin slice" row (what the table shows + what the modal uses for selection context) */
export type RosterRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;

  person_id?: UUID;
  assignment_id?: UUID;

  full_name?: string | null;
  person_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;

  tech_id?: string | null;
  co_name?: string | null;
  co_type?: string | null;

  position_title?: string | null;
  title?: string | null;
  role_title?: string | null;

  start_date?: string | null;
  end_date?: string | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_current_full (rows from public.roster_row_module_v; used to hydrate roster table columns) */
export type RosterCurrentFullRow = {
  assignment_id?: UUID;
  pc_org_id?: UUID;
  pc_org_name?: string | null;

  person_id?: UUID;
  full_name?: string | null;
  emails?: string | null;
  mobile?: string | null;
  fuse_emp_id?: string | null;
  person_notes?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  person_active?: boolean | null;

  tech_id?: string | null;
  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  assignment_active?: boolean | null;

  reports_to_full_name?: string | null;

  co_name?: string | null;
  co_type?: string | null;
  co_code?: string | null;
  co_ref_id?: UUID | null;

  [k: string]: any;
};

/** roster_master "full row model" (richer export shape) */
export type RosterMasterRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  person_id?: UUID;
  assignment_id?: UUID;

  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active?: boolean | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_drilldown history-capable shape (current + ended) */
export type RosterDrilldownRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  person_id?: UUID;
  assignment_id?: UUID;

  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active?: boolean | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_row_module_get (single-call hydration row for the modal: person + assignment + org + leadership) */
export type RosterRowModuleRow = {
  assignment_id?: UUID;
  pc_org_id?: UUID;
  person_id?: UUID;

  // person
  full_name?: string | null;
  emails?: string | null;
  mobile?: string | null;
  fuse_emp_id?: string | null;
  person_notes?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  person_active?: boolean | null;

  // company/contractor
  co_type?: string | null;
  co_code?: string | null;
  co_ref_id?: UUID | null;
  co_name?: string | null;

  // assignment
  tech_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  position_title?: string | null;
  assignment_record_active?: boolean | null;
  assignment_active?: boolean | null;

  // org
  pc_org_name?: string | null;
  pc_id?: UUID | null;
  pc_number?: number | null;
  mso_id?: UUID | null;
  mso_name?: string | null;
  division_id?: UUID | null;
  division_name?: string | null;
  division_code?: string | null;
  region_id?: UUID | null;
  region_name?: string | null;
  region_code?: string | null;

  // leadership
  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  direct_reports?: any[] | null;

  reports_to_reporting_id?: UUID | null;
  reports_to_child_assignment_id?: UUID | null;
  reports_to_start_date?: string | null;
  reports_to_end_date?: string | null;
  reports_to_created_at?: string | null;
  reports_to_created_by?: string | null;
  reports_to_updated_at?: string | null;
  reports_to_updated_by?: string | null;

  [k: string]: any;
};

export type OrgEventRow = {
  org_event_id?: UUID;
  id?: UUID;
  pc_org_id?: UUID;

  created_at?: string | null;
  occurred_at?: string | null;
  at?: string | null;

  summary?: string | null;
  message?: string | null;
  event_label?: string | null;
  event_key?: string | null;
  type?: string | null;

  payload?: any;
  [k: string]: any;
};

export class ApiClient {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = (supabase ?? (createClient() as unknown as SupabaseClient));
  }

  /** Always run RPCs against the `api` schema (canonical app surface). */
  private api() {
    return (this.supabase as any).schema("api") as SupabaseClient;
  }

  private normalize(err: any): ApiError {
    return {
      message: [err?.message, err?.details, err?.hint].filter(Boolean).join(" — ") || "Unknown error",
      code: err?.code,
      status: err?.status,
    };
  }

  /**
   * Ensures the Supabase session is present and refreshes it if it's close to expiring.
   * Useful to avoid "stale token" / partial hydration issues that are fixed by log out/in.
   */
  async ensureSessionFresh(): Promise<void> {
    const auth: any = (this.supabase as any)?.auth;
    if (!auth?.getSession) return;

    const { data, error } = await auth.getSession();
    if (error) return;

    const session = data?.session;
    if (!session) return;

    const expiresAt = session.expires_at ?? 0; // seconds
    const now = Math.floor(Date.now() / 1000);

    // Refresh if expiring within 2 minutes
    if (expiresAt && expiresAt - now < 120) {
      await auth.refreshSession();
    }
  }


/**
 * Privileged write wrapper to `/api/org/rpc`.
 * Keeps writes behind your Edge grant checks + service-role route.
 */
private async rpcWrite<T>(
  schema: "api" | "public",
  fn: string,
  args?: Record<string, any> | null
): Promise<T> {
  await this.ensureSessionFresh();

  const auth: any = (this.supabase as any)?.auth;
  const { data: sessionData } =
    auth?.getSession ? await auth.getSession() : ({ data: null } as any);
  const token: string = sessionData?.session?.access_token ?? "";

  const res = await fetch("/api/org/rpc", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ schema, fn, args: args ?? null }),
  });

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
  const msg = json?.error ?? json?.message ?? `RPC write failed (${res.status})`;
  const err: any = new Error(String(msg));
  err.status = res.status;
  err.code = json?.code ?? undefined;
  err.details = json?.details ?? null;
  err.debug = json?.debug ?? null; // <-- add this
  throw err;
}


  return (json?.data as T) ?? (json as T);
}

  /**
   * Remove keys with value === undefined so PostgREST doesn't treat them as provided params.
   * (Keeping null is intentional; null means "set to null" when the RPC supports that param.)
   */
  private compactRecord<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v;
    }
    return out as Partial<T>;
  }

  /**
   * Try the same RPC with multiple argument-shapes.
   * This prevents UI drift when SQL param names are refined.
   */
  private async rpcWithFallback<T>(
  fn: string,
  argAttempts: Array<Record<string, any> | undefined>
    ): Promise<T> {
      let firstErr: any = null;

      for (const rawArgs of argAttempts) {
        const args = rawArgs ? (this.compactRecord(rawArgs) as Record<string, any>) : undefined;

        const { data, error } = args
          ? await (this.api() as any).rpc(fn, args)
          : await (this.api() as any).rpc(fn);

        if (!error) return data as T;

        // Keep the first error so we don't mask it with a later fallback error
        if (!firstErr) firstErr = error;

        const code = (error as any)?.code;
        const msg = String((error as any)?.message ?? "");

        // Retry ONLY when it's a schema-cache/signature mismatch:
        // - PGRST202: function not found with given params
        // - PGRST203: ambiguous overload selection
        const retryable =
          code === "PGRST202" ||
          code === "PGRST203" ||
          msg.includes("schema cache") ||
          msg.includes("Could not find the function") ||
          msg.includes("Could not choose the best candidate function");

        if (!retryable) {
          throw this.normalize(error); // real error: stop immediately
        }
      }

      throw this.normalize(firstErr);
    }

  async pcOrgChoices(): Promise<PcOrgChoice[]> {
    return (await this.rpcWithFallback<PcOrgChoice[]>("pc_org_choices", [undefined])) ?? [];
  }

    async permissionDefs(): Promise<PermissionDefRow[]> {
    const { data, error } = await this.supabase
      .from("permission_def")
      .select("permission_key,description,created_at")
      .order("permission_key", { ascending: true });

    if (error) throw this.normalize(error);
    return (data as any) ?? [];
  }

  async permissionsForOrg(pc_org_id: string): Promise<PcOrgPermissionGrantRow[]> {
    return (
      (await this.rpcWithFallback<PcOrgPermissionGrantRow[]>("permissions_for_org", [
        { p_pc_org_id: pc_org_id },
        { pc_org_id },
      ])) ?? []
    );
  }

  async permissionGrant(input: {
    pc_org_id: string;
    auth_user_id: string;
    permission_key: string;
    expires_at?: string | null;
    notes?: string | null;
  }): Promise<PcOrgPermissionGrantRow> {
    const { pc_org_id, auth_user_id, permission_key } = input;
    const p_expires_at = input.expires_at ?? null;
    const p_notes = input.notes ?? null;

    return await this.rpcWithFallback<PcOrgPermissionGrantRow>("permission_grant", [
      {
        p_pc_org_id: pc_org_id,
        p_auth_user_id: auth_user_id,
        p_permission_key: permission_key,
        p_expires_at,
        p_notes,
      },
      {
        pc_org_id,
        auth_user_id,
        permission_key,
        expires_at: p_expires_at,
        notes: p_notes,
      },
    ]);
  }

  async permissionRevoke(input: { pc_org_id: string; auth_user_id: string; permission_key: string }): Promise<boolean> {
    const { pc_org_id, auth_user_id, permission_key } = input;

    const out = await this.rpcWithFallback<boolean>("permission_revoke", [
      { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id, p_permission_key: permission_key },
      { pc_org_id, auth_user_id, permission_key },
    ]);

    return !!out;
  }

  async pcOrgAdminMeta(pc_org_id: string): Promise<PcOrgAdminMeta> {
    const { data, error } = await this.supabase
      .from("pc_org_admin_v")
      .select("pc_org_id,mso_name,division_name,region_name")
      .eq("pc_org_id", pc_org_id)
      .maybeSingle();

    if (error) throw this.normalize(error);
    return (data as any) ?? { pc_org_id, mso_name: null, division_name: null, region_name: null };
  }

  async rosterCurrent(pc_org_id: string): Promise<RosterRow[]> {
    return (
      (await this.rpcWithFallback<RosterRow[]>("roster_current", [{ p_pc_org_id: pc_org_id }, { pc_org_id }])) ?? []
    );
  }

  async rosterCurrentFull(pc_org_id: string, position_title?: string | null): Promise<RosterCurrentFullRow[]> {
  const p_position_title = position_title ?? null;

  const { data, error } = await (this.api() as any).rpc("roster_current_full", {
    p_pc_org_id: pc_org_id,
    p_position_title,
  });

  if (error) throw this.normalize(error);

  const rows = (Array.isArray(data) ? data : []) as unknown as RosterCurrentFullRow[];

  // Filter out historical rows to prevent multi-row renders for the same person.
  // Keep rows that are "current" by explicit flag OR by date-window inference.
  const todayIso = new Date().toISOString().slice(0, 10);
  const isIsoDate = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const isCurrent = (r: any) => {
    // Prefer DB-computed field when present (roster_row_module_v provides this).
    if (r?.assignment_active === true) return true;
    if (r?.assignment_active === false) return false;

    // If DB didn't send assignment_active, infer from record_active + date range when available.
    if (r?.assignment_record_active === false) return false;

    const start = r?.start_date ?? r?.assignment_start_date ?? null;
    const end = r?.end_date ?? r?.assignment_end_date ?? null;

    if (isIsoDate(start)) {
      if (start > todayIso) return false;
      if (isIsoDate(end) && end < todayIso) return false;
    }
    return true;
  };

  // Safety: also ensure we stay scoped to the org in case an RPC regression occurs.
  const scoped = rows.filter((r: any) => String(r?.pc_org_id ?? "") === String(pc_org_id ?? ""));

  // Apply "current-only" filter to avoid historical duplicates.
  const currentOnly = scoped.filter(isCurrent);

  // Optional extra safety: if multiple current rows still exist for same person, keep the newest start_date.
  // (This should be rare once DB is cleaned; this is a last-resort deterministic tie-break.)
  const byPerson = new Map<string, RosterCurrentFullRow>();
  for (const r of currentOnly) {
    const pid = String((r as any)?.person_id ?? "").trim();
    if (!pid) continue;

    const existing = byPerson.get(pid);
    if (!existing) {
      byPerson.set(pid, r);
      continue;
    }

    const a = String((existing as any)?.start_date ?? "");
    const b = String((r as any)?.start_date ?? "");
    if (isIsoDate(b) && (!isIsoDate(a) || b > a)) byPerson.set(pid, r);
  }

  // Preserve non-person rows if any (unlikely, but safe)
  const personRows = Array.from(byPerson.values());
  const nonPersonRows = currentOnly.filter((r: any) => !String(r?.person_id ?? "").trim());

  return [...personRows, ...nonPersonRows];
}



  async rosterDrilldown(pc_org_id: string): Promise<RosterDrilldownRow[]> {
    return (
      (await this.rpcWithFallback<RosterDrilldownRow[]>("roster_drilldown", [
        { p_pc_org_id: pc_org_id },
        { pc_org_id },
      ])) ?? []
    );
  }

  async rosterMaster(pc_org_id: string): Promise<RosterMasterRow[]> {
    return (
      (await this.rpcWithFallback<RosterMasterRow[]>("roster_master", [{ p_pc_org_id: pc_org_id }, { pc_org_id }])) ??
      []
    );
  }

  async rosterRowModule(assignment_id: string): Promise<RosterRowModuleRow | null> {
    const data = await this.rpcWithFallback<any>("roster_row_module_get", [
      { p_assignment_id: assignment_id },
      { assignment_id },
      { p_id: assignment_id },
      { id: assignment_id },
    ]);
    return data ?? null;
  }

  async orgEventFeed(pc_org_id: string, limit = 50): Promise<OrgEventRow[]> {
    return (
      (await this.rpcWithFallback<OrgEventRow[]>("org_event_feed", [
        { p_pc_org_id: pc_org_id, p_limit: limit },
        { p_pc_org_id: pc_org_id, limit },
        { pc_org_id, limit },
      ])) ?? []
    );
  }

    async personUpsert(input: {
    person_id: string;
    full_name?: string | null;
    emails?: string | null;
    mobile?: string | null;
    fuse_emp_id?: string | null;
    person_notes?: string | null;
    person_nt_login?: string | null;
    person_csg_id?: string | null;
    active?: boolean | null;
    co_ref_id?: string | null;

    // Newer DB signature (used to disambiguate overloaded person_upsert)
    co_code?: string | null;
    role?: string | null;
  }): Promise<PersonRow | null> {
    const baseArgs = this.compactRecord({
      p_person_id: input.person_id,
      p_full_name: input.full_name ?? undefined,
      p_emails: input.emails ?? undefined,
      p_mobile: input.mobile ?? undefined,
      p_fuse_emp_id: input.fuse_emp_id ?? undefined,
      p_person_notes: input.person_notes ?? undefined,
      p_person_nt_login: input.person_nt_login ?? undefined,
      p_person_csg_id: input.person_csg_id ?? undefined,
      p_active: input.active ?? undefined,
      p_co_ref_id: input.co_ref_id ?? undefined,

      // Only include these when provided (so we don't accidentally null-out fields on update)
      ...(input.co_code !== undefined ? { p_co_code: input.co_code } : {}),
      ...(input.role !== undefined ? { p_role: input.role } : {}),
    });

    try {
      const data = await this.rpcWrite<any>("public", "person_upsert", baseArgs as any);
      return (data as any) ?? null;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      const msg = String(e?.message ?? "");
      const ambiguous =
        code === "PGRST203" && /Could not choose the best candidate function/i.test(msg);

      if (!ambiguous) throw e;

      const retryArgs = this.compactRecord({
        ...(baseArgs as any),
        p_co_code: (baseArgs as any).p_co_code ?? null,
        p_role: (baseArgs as any).p_role ?? null,
      });

      const data = await this.rpcWrite<any>("public", "person_upsert", retryArgs as any);
      return (data as any) ?? null;
    }
  }



  /**
   * Grants-aware person upsert.
   *
   * Primary path: DB RPC `person_upsert` (uses RLS).
   * Fallback path: server route `/api/org/person-upsert` which re-checks org access + permission grants
   * and performs a service-role write (policy exception).
   *
   * This is additive and does NOT change behavior for other callers of `personUpsert`.
   */
  async personUpsertWithGrants(input: {
    person_id: string;
    full_name?: string | null;
    emails?: string | null;
    mobile?: string | null;
    fuse_emp_id?: string | null;
    person_notes?: string | null;
    person_nt_login?: string | null;
    person_csg_id?: string | null;
    active?: boolean | null;
    role?: string | null;
    co_ref_id?: string | null;
    co_code?: string | null;
  }): Promise<PersonRow | null> {
    try {
      return await this.personUpsert(input);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const code = String(e?.code ?? "");
      const looksLikeRls =
        code === "42501" ||
        /row-level security/i.test(msg) ||
        /violates row-level security/i.test(msg);

      if (!looksLikeRls) throw e;

      const res = await fetch("/api/org/person-upsert", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || !json?.ok) {
        // Preserve original context where possible
        throw new Error(String(json?.error ?? msg ?? `Person save blocked (${res.status})`));
      }

      return (json.person as any) ?? null;
    }
  }

  /**
   * Update an existing assignment row (public.assignment).
   * Non-destructive: only provided keys are updated.
   */
  async assignmentUpdate(input: {
    assignment_id: string;
    tech_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    position_title?: string | null;
    active?: boolean | null;
  }): Promise<AssignmentRow | null> {
    const assignment_id = input.assignment_id;

    // Non-destructive: only provided keys are updated.
    const patch = this.compactRecord({
      tech_id: input.tech_id ?? undefined,
      start_date: input.start_date ?? undefined,
      end_date: input.end_date ?? undefined,
      position_title: input.position_title ?? undefined,
      active: input.active ?? undefined,
    });

    const args = this.compactRecord({
      p_assignment_id: assignment_id,
      p_patch: patch,
    });

    const { data, error } = await this.supabase.rpc("assignment_patch", args as any);
    if (error) throw this.normalize(error);
    return (data as any) ?? null;
  }

  /**
   * Upsert a reporting relationship for an assignment.
   * - If assignment_reporting_id is provided, updates that row.
   * - Otherwise inserts a new row.
   */
  

/**
 * End THIS PERSON'S association to a PC Org (person_pc_org).
 * This is a privileged write via `/api/org/rpc` because DB grants may block direct client updates.
 */
async personPcOrgEndAssociation(input: {
  person_id: string;
  pc_org_id: string;
  end_date?: string; // YYYY-MM-DD (defaults to today server-side)
}): Promise<{ ok: true }> {
  const { person_id, pc_org_id } = input;
  const end_date = input.end_date ?? null;

  await this.rpcWrite<any>("public", "person_pc_org_end_association", {
    person_id,
    pc_org_id,
    end_date,
  });

  return { ok: true };
}
async assignmentReportingUpsert(input: {
    assignment_reporting_id?: string | null;
    child_assignment_id: string;
    parent_assignment_id: string;
    start_date: string;
    end_date?: string | null;
  }): Promise<AssignmentReportingRow | null> {
    const args = this.compactRecord({
      p_assignment_reporting_id: input.assignment_reporting_id ?? undefined,
      p_child_assignment_id: input.child_assignment_id,
      p_parent_assignment_id: input.parent_assignment_id,
      p_start_date: input.start_date,
      p_end_date: input.end_date ?? undefined,
    });

    const { data, error } = await this.supabase.rpc(
      "assignment_reporting_upsert_safe",
      args as any
    );

    if (error) throw this.normalize(error);
    return (data as any) ?? null;
  }

  async personGet(person_id: string): Promise<PersonRow | null> {
    const data = await this.rpcWithFallback<any>("person_get", [
      { p_person_id: person_id },
      { person_id },
      { p_id: person_id },
      { id: person_id },
    ]);
    return data ?? null;
  }

  /**
   * Global people directory search (active + inactive).
   * Canonical surface is API schema: api.people_all(p_query, p_limit).
   */
  async peopleAll(query = "", limit = 25): Promise<PersonRow[]> {
    const p_query = query ?? "";
    const p_limit = limit ?? 25;
    const data = await this.rpcWithFallback<any[]>("people_all", [
      { p_query, p_limit },
      { query: p_query, limit: p_limit },
      { p_q: p_query, p_lim: p_limit },
    ]);
    return (data as any[])?.map((r) => r as PersonRow) ?? [];
  }

  /**
   * Globally unassigned people search.
   * Prefer API schema wrapper if present; fall back to public.people_global_unassigned_search if needed.
   */
  async peopleGlobalUnassignedSearch(query = "", limit = 25): Promise<PersonRow[]> {
    const p_query = query ?? "";
    const p_limit = limit ?? 25;

    // Attempt 1: API schema
    try {
      const data = await this.rpcWithFallback<any[]>("people_global_unassigned_search", [
        { p_query, p_limit },
        { query: p_query, limit: p_limit },
      ]);
      return (data as any[])?.map((r) => r as PersonRow) ?? [];
    } catch (e) {
      // Attempt 2: public schema (legacy helper)
      const { data, error } = await (this.supabase as any).rpc("people_global_unassigned_search", {
        p_query,
        p_limit,
      });
      if (error) throw this.normalize(error);
      return (data as any[])?.map((r) => r as PersonRow) ?? [];
    }
  }

/**
 * Globally unassigned people search WITH status filter (active/inactive).
 *
 * This uses the `/api/org/rpc` gateway so manager views don't get crippled by RLS,
 * and so we can keep the UI stable even if we refine RLS policies.
 *
 * Expected DB function: public.people_global_unassigned_search_any(p_query, p_limit, p_active_filter)
 * - p_active_filter: 'active' | 'inactive' (or null to return both)
 */
async peopleGlobalUnassignedSearchAny(input?: {
  query?: string;
  limit?: number;
  active_filter?: "active" | "inactive" | null | string;
  // Accept legacy/canonical param name too (some callers may pass p_active_filter)
  p_active_filter?: "active" | "inactive" | null | string;
}): Promise<PersonRow[]> {
  const p_query = String(input?.query ?? "").trim();
  const p_limit = Number(input?.limit ?? 25);
  const p_active_filter =
    (input as any)?.p_active_filter ?? (input as any)?.active_filter ?? null;

  // Route-gated RPC call (service role). Keep this in "public" schema unless you move the SQL into api.*
  const data = await this.rpcWrite<any[]>("public", "people_global_unassigned_search_any", {
    p_query,
    p_limit,
    p_active_filter,
  });

  return (Array.isArray(data) ? data : []) as unknown as PersonRow[];
}


  /**
   * Wizard: ensure membership chain + create assignment (adds to roster).
   * API schema: api.wizard_process_to_roster(p_notes, p_pc_org_id, p_person_id, p_position_title, p_start_date)
   */
  async wizardProcessToRoster(input: {
    pc_org_id: string;
    person_id: string;
    start_date?: string | null; // YYYY-MM-DD
  }): Promise<PersonPcOrgRow | null> {
    const args = this.compactRecord({
      p_pc_org_id: input.pc_org_id,
      p_person_id: input.person_id,
      // Omit p_start_date to allow DB default (current_date)
      p_start_date: input.start_date ?? undefined,
    });

    const data = await this.rpcWrite<any>("api", "wizard_process_to_roster", args as any);
    return (data as any) ?? null;
  }

  /**
   * Resolve company/contractor display for a person.
   * co_ref_id may point to company_admin_v.company_id OR contractor_admin_v.contractor_id.
   * If co_ref_id is null but co_code exists, we try matching by code.
   */
  async resolveCoDisplay(input: {
    co_ref_id?: string | null;
    co_code?: string | null;
  }): Promise<{ kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null> {
    const co_ref_id = input.co_ref_id ?? null;
    const co_code = input.co_code ?? null;

    // 1) Try by co_ref_id (uuid)
    if (co_ref_id) {
      const company = await this.supabase
        .from("company_admin_v")
        .select("company_id, company_name")
        .eq("company_id", co_ref_id)
        .maybeSingle();

      if (!company.error && company.data?.company_name) {
        return { kind: "company", name: company.data.company_name, matched_on: "id" };
      }

      const contractor = await this.supabase
        .from("contractor_admin_v")
        .select("contractor_id, contractor_name")
        .eq("contractor_id", co_ref_id)
        .maybeSingle();

      if (!contractor.error && contractor.data?.contractor_name) {
        return { kind: "contractor", name: contractor.data.contractor_name, matched_on: "id" };
      }
    }

    // 2) Fallback by co_code (text)
    if (co_code) {
      const companyByCode = await this.supabase
        .from("company_admin_v")
        .select("company_code, company_name")
        .eq("company_code", co_code)
        .maybeSingle();

      if (!companyByCode.error && companyByCode.data?.company_name) {
        return { kind: "company", name: companyByCode.data.company_name, matched_on: "code" };
      }

      const contractorByCode = await this.supabase
        .from("contractor_admin_v")
        .select("contractor_code, contractor_name")
        .eq("contractor_code", co_code)
        .maybeSingle();

      if (!contractorByCode.error && contractorByCode.data?.contractor_name) {
        return { kind: "contractor", name: contractorByCode.data.contractor_name, matched_on: "code" };
      }
    }

    return null;
  }
  async pcOrgEligibilityForUser(auth_user_id: string): Promise<PcOrgEligibilityRow[]> {
    return (
      (await this.rpcWithFallback<PcOrgEligibilityRow[]>("pc_org_eligibility_for_user", [
        { p_auth_user_id: auth_user_id },
        { auth_user_id },
      ])) ?? []
    );
  }

  async pcOrgEligibilityGrant(input: { pc_org_id: string; auth_user_id: string }): Promise<boolean> {
    const { pc_org_id, auth_user_id } = input;

    // Supabase RPC matches by parameter name. We only send the canonical param names and
    // we try both insertion orders to avoid any schema-cache / client quirks.
    const out = await this.rpcWithFallback<boolean>("pc_org_eligibility_grant", [
      { p_auth_user_id: auth_user_id, p_pc_org_id: pc_org_id },
      { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id },
    ]);

    return !!out;
  }

  async pcOrgEligibilityRevoke(input: { pc_org_id: string; auth_user_id: string }): Promise<boolean> {
    const { pc_org_id, auth_user_id } = input;

    const out = await this.rpcWithFallback<boolean>("pc_org_eligibility_revoke", [
      { p_auth_user_id: auth_user_id, p_pc_org_id: pc_org_id },
      { p_pc_org_id: pc_org_id, p_auth_user_id: auth_user_id },
    ]);

    return !!out;
  }


  async isItgSupervisor(auth_user_id: string): Promise<boolean> {
    const out = await this.rpcWithFallback<boolean>("is_itg_supervisor", [
      { p_auth_user_id: auth_user_id },
      { auth_user_id },
    ]);
    return !!out;
  }

}

export type PersonUpsertInput = {
  person_id?: UUID;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;

  /** Additional editable identifiers */
  fuse_emp_id?: string | null;
  person_csg_id?: string | null;
  person_nt_login?: string | null;

  /** Free-form notes */
  person_notes?: string | null;

  status?: string | null;

  /** Allow backend to ignore/accept extra keys as it evolves */
  [k: string]: any;
};

export const api = new ApiClient();
