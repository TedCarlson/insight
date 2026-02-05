import { api, type PersonRow, type RosterDrilldownRow, type RosterMasterRow, type RosterRow } from "@/lib/api";
import { createClient } from "@/shared/data/supabase/client";

// These are parameter bags so the component can pass state setters + ids cleanly.
export type RosterRowModuleCtx = {
  pcOrgId: string;
  row: RosterRow | null;
  supabase: ReturnType<typeof createClient>;
};

export async function loadPositionTitles(_ctx: RosterRowModuleCtx) {
  // moved body
  throw new Error("not implemented");
}

export async function sendInvite(_ctx: RosterRowModuleCtx, _args: any) {
  // moved body
  throw new Error("not implemented");
}

export async function loadPerson(_ctx: RosterRowModuleCtx, _personId: string) {
  // moved body
  throw new Error("not implemented");
}

export async function loadMaster(_ctx: RosterRowModuleCtx) {
  // moved body
  throw new Error("not implemented");
}

export async function loadDrilldown(_ctx: RosterRowModuleCtx) {
  // moved body
  throw new Error("not implemented");
}

export async function savePerson(_ctx: RosterRowModuleCtx, _person: any) {
  // moved body
  throw new Error("not implemented");
}

export async function saveAssignment(_ctx: RosterRowModuleCtx, _payload: any) {
  // moved body
  throw new Error("not implemented");
}

export async function endPcOrgCascade(_ctx: RosterRowModuleCtx, _args: any) {
  // moved body
  throw new Error("not implemented");
}

export async function saveLeadership(_ctx: RosterRowModuleCtx, _payload: any) {
  // moved body
  throw new Error("not implemented");
}

export async function refreshCurrent(_ctx: RosterRowModuleCtx) {
  // moved body
  throw new Error("not implemented");
}