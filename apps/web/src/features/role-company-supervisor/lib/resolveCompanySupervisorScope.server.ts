import { bootstrapProfileServer } from "@/lib/auth/bootstrapProfile.server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

type TeamClass = "ITG" | "BP";

export type CompanySupervisorScopeAssignmentRow = {
  assignment_id: string | null;
  person_id: string | null;
  pc_org_id: string | null;
  tech_id: string | null;
  position_title: string | null;
  active: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  office_id?: string | null;
  office_name?: string | null;
  leader_assignment_id?: string | null;
  leader_person_id?: string | null;
  leader_name?: string | null;
  leader_title?: string | null;
  team_class?: TeamClass;
  contractor_name?: string | null;

  // 🔑 REQUIRED FOR CONTROL STRIP + SCOPING ENGINE
  supervisor_chain_person_ids?: string[];
};

export type CompanySupervisorScopePersonRow = {
  person_id: string;
  full_name: string | null;
  role: string | null;
  co_ref_id: string | null;
};

export type CompanySupervisorScopeRole = "Company Supervisor";

export type CompanySupervisorScopeResult = {
  selected_pc_org_id: string;
  role_label: CompanySupervisorScopeRole;
  rep_full_name: string | null;
  company_label: string | null;
  scoped_assignments: CompanySupervisorScopeAssignmentRow[];
  people_by_id: Map<string, CompanySupervisorScopePersonRow>;
  org_labels_by_id: Map<string, string>;
};

type LeadershipEdgeRow = {
  parent_assignment_id: string | null;
  child_assignment_id: string | null;
  active: boolean | null;
};

type ContractorRow = {
  contractor_id: string | null;
  contractor_name: string | null;
};

type OfficeRow = {
  office_id: string | null;
  office_name: string | null;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v || null;
}

function compareNullableDatesDesc(
  a: string | null | undefined,
  b: string | null | undefined
) {
  const av = normalizeDate(a);
  const bv = normalizeDate(b);
  if (av && bv) return bv.localeCompare(av);
  if (av) return -1;
  if (bv) return 1;
  return 0;
}

function isActiveWindow(
  row: {
    active?: boolean | null;
    start_date?: string | null;
    end_date?: string | null;
  },
  today: string
) {
  const activeOk = row.active === true || row.active == null;
  const startOk = !row.start_date || String(row.start_date) <= today;
  const endOk = !row.end_date || String(row.end_date) >= today;
  return activeOk && startOk && endOk;
}

function choosePreferredAssignment(
  rows: CompanySupervisorScopeAssignmentRow[]
): CompanySupervisorScopeAssignmentRow | null {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => {
    const aActive = a.active === true ? 1 : 0;
    const bActive = b.active === true ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const aOpenEnded = !normalizeDate(a.end_date) ? 1 : 0;
    const bOpenEnded = !normalizeDate(b.end_date) ? 1 : 0;
    if (bOpenEnded !== aOpenEnded) return bOpenEnded - aOpenEnded;

    const endCmp = compareNullableDatesDesc(a.end_date, b.end_date);
    if (endCmp !== 0) return endCmp;

    const startCmp = compareNullableDatesDesc(a.start_date, b.start_date);
    if (startCmp !== 0) return startCmp;

    return String(b.assignment_id ?? "").localeCompare(
      String(a.assignment_id ?? "")
    );
  });

  return sorted[0] ?? null;
}

function dedupeAssignmentsByPerson(
  rows: CompanySupervisorScopeAssignmentRow[]
): CompanySupervisorScopeAssignmentRow[] {
  const byPerson = new Map<string, CompanySupervisorScopeAssignmentRow[]>();
  const passthrough: CompanySupervisorScopeAssignmentRow[] = [];

  for (const row of rows) {
    const personId = String(row.person_id ?? "").trim();
    if (!personId) {
      passthrough.push(row);
      continue;
    }
    const list = byPerson.get(personId) ?? [];
    list.push(row);
    byPerson.set(personId, list);
  }

  const deduped = [...passthrough];
  for (const group of byPerson.values()) {
    const preferred = choosePreferredAssignment(group);
    if (preferred) deduped.push(preferred);
  }

  return deduped;
}

function buildChildrenByParent(edges: LeadershipEdgeRow[]) {
  const out = new Map<string, string[]>();

  for (const edge of edges) {
    const parentId = String(edge.parent_assignment_id ?? "");
    const childId = String(edge.child_assignment_id ?? "");
    if (!parentId || !childId) continue;
    if (edge.active === false) continue;

    const arr = out.get(parentId) ?? [];
    arr.push(childId);
    out.set(parentId, arr);
  }

  return out;
}

function buildParentByChild(edges: LeadershipEdgeRow[]) {
  const out = new Map<string, string>();

  for (const edge of edges) {
    const parentId = String(edge.parent_assignment_id ?? "");
    const childId = String(edge.child_assignment_id ?? "");
    if (!parentId || !childId) continue;
    if (edge.active === false) continue;
    out.set(childId, parentId);
  }

  return out;
}

// 🔑 RESTORED FULL DESCENDANT GRAPH (FIX)
function collectDescendantAssignmentIds(args: {
  seedIds: string[];
  childrenByParent: Map<string, string[]>;
}) {
  const out = new Set<string>();
  const queue = [...args.seedIds];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    if (out.has(current)) continue;

    out.add(current);

    const children = args.childrenByParent.get(current) ?? [];
    for (const childId of children) {
      if (!out.has(childId)) queue.push(childId);
    }
  }

  return out;
}

function buildSupervisorChain(args: {
  assignmentId: string;
  parentByChild: Map<string, string>;
  assignmentsById: Map<string, CompanySupervisorScopeAssignmentRow>;
}) {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cursor = args.parentByChild.get(args.assignmentId) ?? null;

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);

    const assignment = args.assignmentsById.get(cursor);
    if (!assignment) break;

    const personId = String(assignment.person_id ?? "").trim();
    if (personId) chain.push(personId);

    cursor = args.parentByChild.get(cursor) ?? null;
  }

  return chain;
}

function isItgAssignment(args: {
  assignment: CompanySupervisorScopeAssignmentRow;
  person: CompanySupervisorScopePersonRow | undefined;
}) {
  const role = String(args.person?.role ?? "").toLowerCase();
  const positionTitle = String(args.assignment.position_title ?? "").toLowerCase();

  return (
    role === "hires" ||
    role === "employee" ||
    role === "employees" ||
    role === "itg" ||
    positionTitle.includes("itg")
  );
}

function uniqueByTech(rows: CompanySupervisorScopeAssignmentRow[]) {
  const out = new Map<string, CompanySupervisorScopeAssignmentRow>();

  for (const row of rows) {
    const techId = row.tech_id ? String(row.tech_id) : null;
    if (!techId) continue;
    if (!out.has(techId)) out.set(techId, row);
  }

  return [...out.values()];
}

export async function resolveCompanySupervisorScope(): Promise<CompanySupervisorScopeResult> {
  const [boot, scope] = await Promise.all([
    bootstrapProfileServer(),
    requireSelectedPcOrgServer(),
  ]);

  if (!boot.ok || !boot.person_id) {
    throw new Error("No linked person profile");
  }

  if (!scope.ok) {
    throw new Error("No org selected");
  }

  const admin = supabaseAdmin();
  const today = isoToday();
  const selected_pc_org_id = scope.selected_pc_org_id;

  const [meRes, allOrgAssignmentsRes] = await Promise.all([
    admin
      .from("person")
      .select("person_id,full_name,role,co_ref_id")
      .eq("person_id", boot.person_id)
      .maybeSingle(),
    admin
      .from("assignment_admin_v")
      .select(
        "assignment_id,person_id,pc_org_id,tech_id,start_date,end_date,position_title,active,office_id"
      )
      .eq("pc_org_id", selected_pc_org_id),
  ]);

  const me = (meRes.data ?? null) as CompanySupervisorScopePersonRow | null;

  const allOrgAssignments = dedupeAssignmentsByPerson(
    (allOrgAssignmentsRes.data ?? []) as CompanySupervisorScopeAssignmentRow[]
  ).filter((a) => isActiveWindow(a, today));

  const assignmentsById = new Map<string, CompanySupervisorScopeAssignmentRow>();
  for (const row of allOrgAssignments) {
    const id = String(row.assignment_id ?? "");
    if (id) assignmentsById.set(id, row);
  }

  const myAssignmentIds = allOrgAssignments
    .filter((a) => String(a.person_id) === String(boot.person_id))
    .map((a) => String(a.assignment_id ?? ""))
    .filter(Boolean);

  const leadershipRes = await admin
    .from("assignment_leadership_admin_v")
    .select("parent_assignment_id,child_assignment_id,active")
    .eq("active", true);

  const childrenByParent = buildChildrenByParent(
    (leadershipRes.data ?? []) as LeadershipEdgeRow[]
  );
  const parentByChild = buildParentByChild(
    (leadershipRes.data ?? []) as LeadershipEdgeRow[]
  );

  const descendantIds = collectDescendantAssignmentIds({
    seedIds: myAssignmentIds,
    childrenByParent,
  });

  const descendantAssignments = Array.from(descendantIds)
    .map((id) => assignmentsById.get(id))
    .filter((x): x is CompanySupervisorScopeAssignmentRow => !!x);

  const peopleRes = await admin
    .from("person")
    .select("person_id,full_name,role,co_ref_id");

  const people_by_id = new Map<string, CompanySupervisorScopePersonRow>();
  for (const p of (peopleRes.data ?? []) as CompanySupervisorScopePersonRow[]) {
    people_by_id.set(String(p.person_id), p);
  }

  const scoped_assignments = uniqueByTech(
    descendantAssignments.map((assignment) => {
      const person = people_by_id.get(String(assignment.person_id ?? ""));
      const isItg = isItgAssignment({ assignment, person });

      return {
        ...assignment,
        team_class: isItg ? "ITG" : "BP",
        supervisor_chain_person_ids: buildSupervisorChain({
          assignmentId: String(assignment.assignment_id ?? ""),
          parentByChild,
          assignmentsById,
        }),
      };
    })
  );

  return {
    selected_pc_org_id,
    role_label: "Company Supervisor",
    rep_full_name: me?.full_name ?? null,
    company_label: null,
    scoped_assignments,
    people_by_id,
    org_labels_by_id: new Map(),
  };
}