import type {
  AssignmentReportingRow,
  AssignmentRow,
  PersonPcOrgRow,
  RosterCurrentFullRow,
  RosterDrilldownRow,
  RosterMasterRow,
  RosterRow,
  RosterRowModuleRow,
} from "../types";
import type { ApiModuleCtx } from "./_ctx";

export async function rosterCurrent(ctx: ApiModuleCtx, pc_org_id: string): Promise<RosterRow[]> {
  return (
    (await ctx.rpcWithFallback<RosterRow[]>("roster_current", [
      { p_pc_org_id: pc_org_id },
      { pc_org_id },
    ])) ?? []
  );
}

export async function rosterCurrentFull(
  ctx: ApiModuleCtx,
  pc_org_id: string,
  position_title?: string | null
): Promise<RosterCurrentFullRow[]> {
  const p_position_title = position_title ?? null;

  const { data, error } = await (ctx.api() as any).rpc("roster_current_full", {
    p_pc_org_id: pc_org_id,
    p_position_title,
  });

  if (error) throw ctx.normalize(error);

  const rows = (Array.isArray(data) ? data : []) as unknown as RosterCurrentFullRow[];

  // ----------------------------
  // Helpers
  // ----------------------------
  const todayIso = new Date().toISOString().slice(0, 10);
  const isIsoDate = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

  // Existing "current assignment" filter (kept).
  const isCurrent = (r: any) => {
    if (r?.assignment_active === true) return true;
    if (r?.assignment_active === false) return false;

    if (r?.assignment_record_active === false) return false;

    const start = r?.start_date ?? r?.assignment_start_date ?? null;
    const end = r?.end_date ?? r?.assignment_end_date ?? null;

    if (isIsoDate(start)) {
      if (start > todayIso) return false;
      if (isIsoDate(end) && end < todayIso) return false;
    }
    return true;
  };

  const pickMembershipBool = (r: any): boolean | null => {
    const candidates = [
      r?.membership_active,
      r?.person_pc_org_active,
      r?.pc_org_active,
      r?.person_pc_org_record_active,
      r?.membership_record_active,
    ];

    for (const v of candidates) {
      if (v === true) return true;
      if (v === false) return false;
    }
    return null; // not present / not usable
  };

  const pickMembershipEnd = (r: any): string | null => {
    const end =
      r?.membership_end_date ??
      r?.person_pc_org_end_date ??
      r?.pc_org_end_date ??
      r?.membershipEndDate ??
      null;
    if (typeof end === "string") {
      const s = end.trim();
      return s ? s : null;
    }
    return null;
  };

  const pickMembershipStatus = (r: any): string | null => {
    const status =
      r?.membership_status ??
      r?.person_pc_org_status ??
      r?.pc_org_status ??
      r?.membershipStatus ??
      null;
    if (typeof status === "string") {
      const s = status.trim();
      return s ? s : null;
    }
    return null;
  };

  // STRICT-BUT-SAFE membership gate:
  // 1) If an explicit membership boolean exists, it MUST be true.
  // 2) Regardless, end_date must be null/empty and status must not be inactive.
  const isActiveMembershipStrictSafe = (r: any) => {
    const mBool = pickMembershipBool(r);
    if (mBool === false) return false; // explicit false => out
    if (mBool === true) {
      // still verify end/status aren't contradicting
    } else {
      // mBool is null (not provided): fall back to end/status checks
    }

    const end = pickMembershipEnd(r);
    if (end && (isIsoDate(end) || end.length > 0)) return false;

    const status = pickMembershipStatus(r);
    if (status && status.toLowerCase() === "inactive") return false;

    // If boolean exists, require it to be true. If not provided, allow via end/status.
    if (mBool === null) return true;
    return mBool === true;
  };

  // ----------------------------
  // Scope + current filtering
  // ----------------------------
  const scoped = rows.filter((r: any) => String(r?.pc_org_id ?? "") === String(pc_org_id ?? ""));
  const currentOnly = scoped.filter(isCurrent);

  // Membership gate on person rows.
  const membershipScoped = currentOnly.filter((r: any) => {
    const pid = String(r?.person_id ?? "").trim();
    if (!pid) return true; // keep non-person rows (slots/placeholders)
    return isActiveMembershipStrictSafe(r);
  });

  // ----------------------------
  // De-dupe: choose the best row per person
  // ----------------------------
  const byPerson = new Map<string, RosterCurrentFullRow>();
  for (const r of membershipScoped) {
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

  const personRows = Array.from(byPerson.values());
  const nonPersonRows = membershipScoped.filter((r: any) => !String(r?.person_id ?? "").trim());
  return [...personRows, ...nonPersonRows];
}

export async function rosterDrilldown(ctx: ApiModuleCtx, pc_org_id: string): Promise<RosterDrilldownRow[]> {
  return (
    (await ctx.rpcWithFallback<RosterDrilldownRow[]>("roster_drilldown", [
      { p_pc_org_id: pc_org_id },
      { pc_org_id },
    ])) ?? []
  );
}

export async function rosterMaster(ctx: ApiModuleCtx, pc_org_id: string): Promise<RosterMasterRow[]> {
  return (
    (await ctx.rpcWithFallback<RosterMasterRow[]>("roster_master", [
      { p_pc_org_id: pc_org_id },
      { pc_org_id },
    ])) ?? []
  );
}

export async function rosterRowModule(
  ctx: ApiModuleCtx,
  assignment_id: string
): Promise<RosterRowModuleRow | null> {
  const data = await ctx.rpcWithFallback<any>("roster_row_module_get", [
    { p_assignment_id: assignment_id },
    { assignment_id },
    { p_id: assignment_id },
    { id: assignment_id },
  ]);
  return data ?? null;
}

export async function wizardProcessToRoster(
  ctx: ApiModuleCtx,
  input: { pc_org_id: string; person_id: string; start_date?: string | null }
): Promise<PersonPcOrgRow | null> {
  const args = ctx.compactRecord({
    p_pc_org_id: input.pc_org_id,
    p_person_id: input.person_id,
    p_start_date: input.start_date ?? undefined,
  });

  const data = await ctx.rpcWrite<any>("api", "wizard_process_to_roster", args as any);
  return (data as any) ?? null;
}

export async function assignmentUpdate(
  ctx: ApiModuleCtx,
  input: {
    assignment_id: string;
    tech_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    position_title?: string | null;
    active?: boolean | null;
    office_id?: string | null;
  }
): Promise<AssignmentRow | null> {
  const assignment_id = input.assignment_id;

  const patch = ctx.compactRecord({
    tech_id: input.tech_id ?? undefined,
    start_date: input.start_date ?? undefined,
    end_date: input.end_date ?? undefined,
    position_title: input.position_title ?? undefined,
    active: input.active ?? undefined,
    office_id: input.office_id ?? undefined,
  });

  const args = ctx.compactRecord({
    p_assignment_id: assignment_id,
    p_patch: patch,
  });

  const { data, error } = await ctx.supabase.rpc("assignment_patch", args as any);
  if (error) throw ctx.normalize(error);
  return (data as any) ?? null;
}

export async function assignmentReportingUpsert(
  ctx: ApiModuleCtx,
  input: {
    assignment_reporting_id?: string | null;
    child_assignment_id: string;
    parent_assignment_id: string;
    start_date: string;
    end_date?: string | null;
  }
): Promise<AssignmentReportingRow | null> {
  const args = ctx.compactRecord({
    p_assignment_reporting_id: input.assignment_reporting_id ?? undefined,
    p_child_assignment_id: input.child_assignment_id,
    p_parent_assignment_id: input.parent_assignment_id,
    p_start_date: input.start_date,
    p_end_date: input.end_date ?? undefined,
  });

  const { data, error } = await ctx.supabase.rpc("assignment_reporting_upsert_safe", args as any);
  if (error) throw ctx.normalize(error);
  return (data as any) ?? null;
}

export async function personPcOrgEndAssociation(
  ctx: ApiModuleCtx,
  input: { person_id: string; pc_org_id: string; end_date?: string }
): Promise<{ ok: true }> {
  const { person_id, pc_org_id } = input;
  const end_date = input.end_date ?? null;

  await ctx.rpcWrite<any>("public", "person_pc_org_end_association", {
    person_id,
    pc_org_id,
    end_date,
  });

  return { ok: true };
}