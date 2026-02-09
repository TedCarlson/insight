// apps/web/src/app/api/org/rpc/_rpc.types.ts

export type RpcSchema = "api" | "public";

export type RpcRequest = {
  schema?: RpcSchema;
  fn?: string;
  args?: Record<string, any> | null;
};

// Onboard reads that must be "global visible" for roster managers
export const ONBOARD_GLOBAL_READS = new Set<string>([
  "people_unassigned_search",
  "people_global_unassigned_search",
  "people_global_unassigned_search_any",
  "person_picker",
  "person_get",
]);

// Actively tied to UI events – do not remove
export const RPC_ALLOWLIST = new Set<string>([
  // ----- Reads (Onboard pool / pickers) -----
  "people_unassigned_search",
  "people_global_unassigned_search",
  "people_global_unassigned_search_any",
  "person_picker",
  "person_get",

  // ----- Writes -----
  // public schema writes
  "person_upsert",
  "assignment_patch",
  "assignment_reporting_upsert_safe",
  "person_pc_org_end_association",

  // api schema writes
  "permission_grant",
  "permission_revoke",
  "pc_org_eligibility_grant",
  "pc_org_eligibility_revoke",
  "add_to_roster",

  // ✅ Assignment lifecycle (new canonical contract)
  "assignment_start",
  "assignment_end",
]);