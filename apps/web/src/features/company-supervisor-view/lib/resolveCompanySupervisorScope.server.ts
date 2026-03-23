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
  team_class?: TeamClass;
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

function isoToday() {
  return new Date().toISOString().slice(0, 10);
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

async function loadOrgLabels(
  admin: ReturnType<typeof supabaseAdmin>,
  pcOrgIds: string[]
) {
  const out = new Map<string, string>();
  if (!pcOrgIds.length) return out;

  const { data } = await admin
    .from("pc_org")
    .select("pc_org_id,pc_org_name")
    .in("pc_org_id", pcOrgIds);

  for (const row of data ?? []) {
    if (row?.pc_org_id) {
      out.set(
        String(row.pc_org_id),
        row?.pc_org_name ? String(row.pc_org_name) : String(row.pc_org_id)
      );
    }
  }

  for (const id of pcOrgIds) {
    if (!out.has(id)) out.set(id, id);
  }

  return out;
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

  const [meRes, assignmentsRes] = await Promise.all([
    admin
      .from("person")
      .select("person_id,full_name,role,co_ref_id")
      .eq("person_id", boot.person_id)
      .maybeSingle(),
    admin
      .from("assignment_admin_v")
      .select(
        "assignment_id,person_id,pc_org_id,tech_id,start_date,end_date,position_title,active"
      )
      .eq("pc_org_id", selected_pc_org_id)
      .eq("active", true)
      .not("tech_id", "is", null),
  ]);

  const me = (meRes.data ?? null) as CompanySupervisorScopePersonRow | null;

  if (!me) {
    throw new Error("Unable to resolve current person");
  }

  const candidateAssignments = uniqueByTech(
    ((assignmentsRes.data ?? []) as CompanySupervisorScopeAssignmentRow[]).filter(
      (a) => isActiveWindow(a, today)
    )
  );

  const personIds = Array.from(
    new Set(candidateAssignments.map((r) => String(r.person_id ?? "")).filter(Boolean))
  );

  const peopleRes = personIds.length
    ? await admin
        .from("person")
        .select("person_id,full_name,role,co_ref_id")
        .in("person_id", personIds)
    : { data: [] as CompanySupervisorScopePersonRow[] };

  const people_by_id = new Map<string, CompanySupervisorScopePersonRow>();
  for (const row of (peopleRes.data ?? []) as CompanySupervisorScopePersonRow[]) {
    people_by_id.set(String(row.person_id), row);
  }

  const scoped_assignments = candidateAssignments.map((assignment) => {
    const personId = String(assignment.person_id ?? "");
    const person = people_by_id.get(personId);

    const role = String(person?.role ?? "").toLowerCase();
    const positionTitle = String(assignment.position_title ?? "").toLowerCase();

    let team_class: TeamClass = "BP";

    const isItgRole =
      role === "hires" ||
      role === "employee" ||
      role === "employees" ||
      role === "itg" ||
      positionTitle.includes("itg");

    if (isItgRole) {
      team_class = "ITG";
    }

    return {
      ...assignment,
      team_class,
    };
  });

  const org_labels_by_id = await loadOrgLabels(admin, [selected_pc_org_id]);

  return {
    selected_pc_org_id,
    role_label: "Company Supervisor",
    rep_full_name: me.full_name ? String(me.full_name) : null,
    company_label: null,
    scoped_assignments,
    people_by_id,
    org_labels_by_id,
  };
}