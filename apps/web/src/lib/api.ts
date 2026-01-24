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
  private async rpcWithFallback<T>(fn: string, argAttempts: Array<Record<string, any> | undefined>): Promise<T> {
    let lastErr: any = null;

    for (const args of argAttempts) {
      const { data, error } = args ? await (this.api() as any).rpc(fn, args) : await (this.api() as any).rpc(fn);
      if (!error) return data as T;
      lastErr = error;
    }

    throw this.normalize(lastErr);
  }

  async pcOrgChoices(): Promise<PcOrgChoice[]> {
    return (await this.rpcWithFallback<PcOrgChoice[]>("pc_org_choices", [undefined])) ?? [];
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
    return (
      (await this.rpcWithFallback<RosterCurrentFullRow[]>("roster_current_full", [
        { p_pc_org_id: pc_org_id, p_position_title },
        { pc_org_id, position_title: p_position_title },
      ])) ?? []
    );
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
  role?: string | null;
  co_ref_id?: string | null;
  co_code?: string | null;
}): Promise<PersonRow | null> {
  // Exact signature (from pg_proc):
  // api.person_upsert(
  //   p_person_id uuid,
  //   p_full_name text,
  //   p_emails text,
  //   p_mobile text,
  //   p_fuse_emp_id text,
  //   p_person_notes text,
  //   p_person_nt_login text,
  //   p_person_csg_id text,
  //   p_active boolean,
  //   p_role text,
  //   p_co_ref_id uuid,
  //   p_co_code text
  // ) returns person

  const args = this.compactRecord({
    p_person_id: input.person_id,
    p_full_name: input.full_name ?? undefined,
    p_emails: input.emails ?? undefined,
    p_mobile: input.mobile ?? undefined,
    p_fuse_emp_id: input.fuse_emp_id ?? undefined,
    p_person_notes: input.person_notes ?? undefined,
    p_person_nt_login: input.person_nt_login ?? undefined,
    p_person_csg_id: input.person_csg_id ?? undefined,
    p_active: input.active ?? undefined,
    p_role: input.role ?? undefined,
    p_co_ref_id: input.co_ref_id ?? undefined,
    p_co_code: input.co_code ?? undefined,
  });

  const { data, error } = await this.supabase.rpc("person_upsert", args as any);
  if (error) throw this.normalize(error);
  return (data as any) ?? null;
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
    const patch = this.compactRecord({
      tech_id: input.tech_id ?? undefined,
      start_date: input.start_date ?? undefined,
      end_date: input.end_date ?? undefined,
      position_title: input.position_title ?? undefined,
      active: input.active ?? undefined,
    });

    const { data, error } = await this.supabase
      .from("assignment")
      .update(patch as any)
      .eq("assignment_id", assignment_id)
      .select("*")
      .maybeSingle();

    if (error) throw this.normalize(error);
    return (data as any) ?? null;
  }

  /**
   * Upsert a reporting relationship for an assignment.
   * - If assignment_reporting_id is provided, updates that row.
   * - Otherwise inserts a new row.
   */
  async assignmentReportingUpsert(input: {
    assignment_reporting_id?: string | null;
    child_assignment_id: string;
    parent_assignment_id: string;
    start_date: string;
    end_date?: string | null;
  }): Promise<AssignmentReportingRow | null> {
    const assignment_reporting_id = input.assignment_reporting_id ?? null;

    const patch = this.compactRecord({
      child_assignment_id: input.child_assignment_id,
      parent_assignment_id: input.parent_assignment_id,
      start_date: input.start_date,
      end_date: input.end_date ?? undefined,
    });

    if (assignment_reporting_id) {
      const { data, error } = await this.supabase
        .from("assignment_reporting")
        .update(patch as any)
        .eq("assignment_reporting_id", assignment_reporting_id)
        .select("*")
        .maybeSingle();

      if (error) throw this.normalize(error);
      return (data as any) ?? null;
    }

    const { data, error } = await this.supabase
      .from("assignment_reporting")
      .insert(patch as any)
      .select("*")
      .maybeSingle();

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
   * Wizard: ensure membership chain + create assignment (adds to roster).
   * API schema: api.wizard_process_to_roster(p_notes, p_pc_org_id, p_person_id, p_position_title, p_start_date)
   */
  async wizardProcessToRoster(input: {
    pc_org_id: string;
    person_id: string;
    position_title?: string | null;
    start_date: string;
    notes?: string | null;
  }): Promise<AssignmentRow> {
    // NOTE: We intentionally send *all* RPC params, including nulls.
    // The SQL function signature requires these named params:
    // api.wizard_process_to_roster(p_notes, p_pc_org_id, p_person_id, p_position_title, p_start_date)
    // Passing undefined would drop keys and cause a schema-cache mismatch.
    const args = this.compactRecord({
      p_pc_org_id: input.pc_org_id,
      p_person_id: input.person_id,
      p_position_title: input.position_title ?? null,
      p_start_date: input.start_date,
      p_notes: input.notes ?? null,
    });

    // Back-compat attempt (older param names) — also send nulls so keys are present.
    const legacyArgs = {
      pc_org_id: input.pc_org_id,
      person_id: input.person_id,
      position_title: input.position_title ?? null,
      start_date: input.start_date,
      notes: input.notes ?? null,
    };

    const data = await this.rpcWithFallback<any>("wizard_process_to_roster", [args, legacyArgs]);
    return data as AssignmentRow;
  }

/**
 * Resolve company/contractor display for a person.
 * co_ref_id may point to company_admin_v.company_id OR contractor_admin_v.contractor_id.
 * If co_ref_id is null but co_code exists, we try matching by code.
 */
async resolveCoDisplay(input: { co_ref_id?: string | null; co_code?: string | null }): Promise<{ kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null> {
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
