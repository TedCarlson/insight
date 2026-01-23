// apps/web/src/lib/api.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type ApiError = {
  message: string;
  code?: string;
  status?: number;
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
      message: err?.message ?? "Unknown error",
      code: err?.code,
      status: err?.status,
    };
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

  async rosterCurrent(pc_org_id: string): Promise<RosterRow[]> {
    return (
      (await this.rpcWithFallback<RosterRow[]>("roster_current", [{ p_pc_org_id: pc_org_id }, { pc_org_id }])) ?? []
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

  async orgEventFeed(pc_org_id: string, limit = 50): Promise<OrgEventRow[]> {
    return (
      (await this.rpcWithFallback<OrgEventRow[]>("org_event_feed", [
        { p_pc_org_id: pc_org_id, p_limit: limit },
        { p_pc_org_id: pc_org_id, limit },
        { pc_org_id, limit },
      ])) ?? []
    );
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
}

export const api = new ApiClient();
