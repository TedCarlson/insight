// apps/web/src/shared/lib/api.ts
import type { SupabaseClient } from "@/shared/data/supabase/types";
import { createClient } from "@/shared/data/supabase/client";

import type {
  ApiError,
  AssignmentReportingRow,
  AssignmentRow,
  IsoDateString,
  OrgEventRow,
  PcOrgAdminMeta,
  PcOrgChoice,
  PcOrgEligibilityRow,
  PcOrgPermissionGrantRow,
  PermissionDefRow,
  PersonPcOrgRow,
  PersonRow,
  PersonUpsertInput,
  RosterCurrentFullRow,
  RosterDrilldownRow,
  RosterMasterRow,
  RosterRow,
  RosterRowModuleRow,
  UUID,
} from "./apiClient/types";

export type {
  ApiError,
  AssignmentReportingRow,
  AssignmentRow,
  IsoDateString,
  OrgEventRow,
  PcOrgAdminMeta,
  PcOrgChoice,
  PcOrgEligibilityRow,
  PcOrgPermissionGrantRow,
  PermissionDefRow,
  PersonPcOrgRow,
  PersonRow,
  PersonUpsertInput,
  RosterCurrentFullRow,
  RosterDrilldownRow,
  RosterMasterRow,
  RosterRow,
  RosterRowModuleRow,
  UUID,
} from "./apiClient/types";

// core
import { compactRecord } from "./apiClient/core/compact";
import { normalizeApiError } from "./apiClient/core/errors";
import { ensureSessionFresh } from "./apiClient/core/session";
import { rpcWithFallback } from "./apiClient/core/rpcRead";
import { rpcWrite } from "./apiClient/core/rpcWrite";
import { apiSchemaClient } from "./apiClient/core/supabase";

// modules
import type { ApiModuleCtx } from "./apiClient/modules/_ctx";
import {
  assignmentReportingUpsert,
  assignmentUpdate,
  personPcOrgEndAssociation,
  rosterCurrent,
  rosterCurrentFull,
  rosterDrilldown,
  rosterMaster,
  rosterRowModule,
  wizardProcessToRoster,
} from "./apiClient/modules/roster";
import {
  peopleAll,
  peopleGlobalUnassignedSearch,
  peopleGlobalUnassignedSearchAny,
  personGet,
  personUpsert,
  personUpsertWithGrants,
} from "./apiClient/modules/people";
import {
  permissionDefs,
  permissionGrant,
  permissionRevoke,
  permissionsForOrg,
} from "./apiClient/modules/permissions";
import { orgEventFeed, pcOrgAdminMeta, pcOrgChoices, isItgSupervisor } from "./apiClient/modules/org";
import {
  pcOrgEligibilityForUser,
  pcOrgEligibilityGrant,
  pcOrgEligibilityRevoke,
} from "./apiClient/modules/eligibility";
import { resolveCoDisplay } from "./apiClient/modules/company";

export class ApiClient {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = (supabase ?? (createClient() as unknown as SupabaseClient)) as SupabaseClient;
  }

  /** Always run RPCs against the `api` schema (canonical app surface). */
  private api(): SupabaseClient {
    return apiSchemaClient(this.supabase);
  }

  private normalize(err: any): ApiError {
    return normalizeApiError(err);
  }

  async ensureSessionFresh(): Promise<void> {
    await ensureSessionFresh(this.supabase);
  }

  private compactRecord<T extends Record<string, any>>(obj: T): Partial<T> {
    return compactRecord(obj);
  }

  private async rpcWrite<T>(
    schema: "api" | "public",
    fn: string,
    args?: Record<string, any> | null
  ): Promise<T> {
    return await rpcWrite<T>(this.supabase, { schema, fn, args: args ?? null });
  }

  private async rpcWithFallback<T>(
    fn: string,
    argAttempts: Array<Record<string, any> | undefined>
  ): Promise<T> {
    return await rpcWithFallback<T>(this.supabase, fn, argAttempts);
  }

  private moduleCtx(): ApiModuleCtx {
    return {
      supabase: this.supabase,
      api: () => this.api(),
      normalize: (e) => this.normalize(e),
      compactRecord: (o) => this.compactRecord(o),
      rpcWithFallback: async <T>(fn: string, attempts: Array<Record<string, any> | undefined>) =>
        await this.rpcWithFallback<T>(fn, attempts),
      rpcWrite: async <T>(schema: "api" | "public", fn: string, args?: Record<string, any> | null) =>
        await this.rpcWrite<T>(schema, fn, args ?? null),
    };
  }

  // -------- org --------
  async pcOrgChoices(): Promise<PcOrgChoice[]> {
    return await pcOrgChoices(this.moduleCtx());
  }

  async pcOrgAdminMeta(pc_org_id: string): Promise<PcOrgAdminMeta> {
    return await pcOrgAdminMeta(this.moduleCtx(), pc_org_id);
  }

  async orgEventFeed(pc_org_id: string, limit = 50): Promise<OrgEventRow[]> {
    return await orgEventFeed(this.moduleCtx(), pc_org_id, limit);
  }

  async isItgSupervisor(auth_user_id: string): Promise<boolean> {
    return await isItgSupervisor(this.moduleCtx(), auth_user_id);
  }

  // -------- permissions --------
  async permissionDefs(): Promise<PermissionDefRow[]> {
    return await permissionDefs(this.moduleCtx());
  }

  async permissionsForOrg(pc_org_id: string): Promise<PcOrgPermissionGrantRow[]> {
    return await permissionsForOrg(this.moduleCtx(), pc_org_id);
  }

  async permissionGrant(input: {
    pc_org_id: string;
    auth_user_id: string;
    permission_key: string;
    expires_at?: string | null;
    notes?: string | null;
  }): Promise<PcOrgPermissionGrantRow> {
    return await permissionGrant(this.moduleCtx(), input);
  }

  async permissionRevoke(input: {
    pc_org_id: string;
    auth_user_id: string;
    permission_key: string;
  }): Promise<boolean> {
    return await permissionRevoke(this.moduleCtx(), input);
  }

  // -------- roster reads --------
  async rosterCurrent(pc_org_id: string): Promise<RosterRow[]> {
    return await rosterCurrent(this.moduleCtx(), pc_org_id);
  }

  async rosterCurrentFull(pc_org_id: string, position_title?: string | null): Promise<RosterCurrentFullRow[]> {
    return await rosterCurrentFull(this.moduleCtx(), pc_org_id, position_title);
  }

  async rosterDrilldown(pc_org_id: string): Promise<RosterDrilldownRow[]> {
    return await rosterDrilldown(this.moduleCtx(), pc_org_id);
  }

  async rosterMaster(pc_org_id: string): Promise<RosterMasterRow[]> {
    return await rosterMaster(this.moduleCtx(), pc_org_id);
  }

  async rosterRowModule(assignment_id: string): Promise<RosterRowModuleRow | null> {
    return await rosterRowModule(this.moduleCtx(), assignment_id);
  }

  // -------- roster writes --------
  async wizardProcessToRoster(input: {
    pc_org_id: string;
    person_id: string;
    start_date?: string | null;
  }): Promise<PersonPcOrgRow | null> {
    return await wizardProcessToRoster(this.moduleCtx(), input);
  }

  async assignmentUpdate(input: {
    assignment_id: string;
    tech_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    position_title?: string | null;
    active?: boolean | null;
    office_id?: string | null;
  }): Promise<AssignmentRow | null> {
    return await assignmentUpdate(this.moduleCtx(), input);
  }

  async assignmentReportingUpsert(input: {
    assignment_reporting_id?: string | null;
    child_assignment_id: string;
    parent_assignment_id: string;
    start_date: string;
    end_date?: string | null;
  }): Promise<AssignmentReportingRow | null> {
    return await assignmentReportingUpsert(this.moduleCtx(), input);
  }

  async personPcOrgEndAssociation(input: {
    person_id: string;
    pc_org_id: string;
    end_date?: string;
  }): Promise<{ ok: true }> {
    return await personPcOrgEndAssociation(this.moduleCtx(), input);
  }

  // -------- people --------
  async personGet(person_id: string): Promise<PersonRow | null> {
    return await personGet(this.moduleCtx(), person_id);
  }

  async peopleAll(query = "", limit = 25): Promise<PersonRow[]> {
    return await peopleAll(this.moduleCtx(), query, limit);
  }

  async peopleGlobalUnassignedSearch(query = "", limit = 25): Promise<PersonRow[]> {
    return await peopleGlobalUnassignedSearch(this.moduleCtx(), query, limit);
  }

  async peopleGlobalUnassignedSearchAny(input?: {
    query?: string;
    limit?: number;
    active_filter?: "active" | "inactive" | null | string;
    p_active_filter?: "active" | "inactive" | null | string;
  }): Promise<PersonRow[]> {
    return await peopleGlobalUnassignedSearchAny(this.moduleCtx(), input);
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
    co_code?: string | null;
    role?: string | null;
  }): Promise<PersonRow | null> {
    return await personUpsert(this.moduleCtx(), input);
  }

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
    return await personUpsertWithGrants(this.moduleCtx(), input);
  }

  // -------- eligibility --------
  async pcOrgEligibilityForUser(auth_user_id: string): Promise<PcOrgEligibilityRow[]> {
    return await pcOrgEligibilityForUser(this.moduleCtx(), auth_user_id);
  }

  async pcOrgEligibilityGrant(input: { pc_org_id: string; auth_user_id: string }): Promise<boolean> {
    return await pcOrgEligibilityGrant(this.moduleCtx(), input);
  }

  async pcOrgEligibilityRevoke(input: { pc_org_id: string; auth_user_id: string }): Promise<boolean> {
    return await pcOrgEligibilityRevoke(this.moduleCtx(), input);
  }

  // -------- company --------
  async resolveCoDisplay(input: {
    co_ref_id?: string | null;
    co_code?: string | null;
  }): Promise<{ kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null> {
    return await resolveCoDisplay(this.moduleCtx(), input);
  }
}

export const api = new ApiClient();