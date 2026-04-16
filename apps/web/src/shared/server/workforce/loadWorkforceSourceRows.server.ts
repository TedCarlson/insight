import { supabaseServer } from "@/shared/data/supabase/server";
import type { WorkforceSourceRow } from "./buildWorkforceSurfacePayload.server";

type EnrichedRow = {
  person_id: string;
  full_name: string | null;
  preferred_name: string | null;
  person_status: "active" | "inactive" | "archived" | null;
  pc_org_id: string;
  position_title: string | null;
  role_type: string | null;
  is_field: boolean | null;
  is_leadership: boolean | null;
  allows_tech: boolean | null;
  tech_id: string | null;
  reports_to_person_id: string | null;
  reports_to_full_name: string | null;
  effective_start_date: string | null;
  effective_end_date: string | null;
  active_flag: boolean | null;
  is_incomplete: boolean | null;
};

function splitName(fullName: string | null | undefined): {
  first_name: string | null;
  last_name: string | null;
} {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return {
    first_name: parts[0] ?? null,
    last_name: parts.slice(1).join(" ") || null,
  };
}

function overlapsAsOfDate(args: {
  start_date: string | null;
  end_date: string | null;
  as_of_date: string;
}) {
  const startOk = !args.start_date || args.start_date <= args.as_of_date;
  const endOk = !args.end_date || args.end_date >= args.as_of_date;
  return startOk && endOk;
}

export async function loadWorkforceSourceRows(args: {
  pc_org_id: string;
  as_of_date: string;
}): Promise<WorkforceSourceRow[]> {
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("v_company_profile_enriched")
    .select(`
      person_id,
      full_name,
      preferred_name,
      person_status,
      pc_org_id,
      position_title,
      role_type,
      is_field,
      is_leadership,
      allows_tech,
      tech_id,
      reports_to_person_id,
      reports_to_full_name,
      effective_start_date,
      effective_end_date,
      active_flag,
      is_incomplete
    `)
    .eq("pc_org_id", args.pc_org_id)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EnrichedRow[])
    .filter((row) =>
      overlapsAsOfDate({
        start_date: row.effective_start_date ?? null,
        end_date: row.effective_end_date ?? null,
        as_of_date: args.as_of_date,
      })
    )
    .map((row) => {
      const { first_name, last_name } = splitName(row.full_name);

      return {
        person_id: row.person_id,
        tech_id: row.tech_id ?? null,

        first_name,
        preferred_name: row.preferred_name ?? null,
        last_name,

        office: null,
        reports_to_name: row.reports_to_full_name ?? null,

        mobile: null,
        nt_login: null,
        csg: null,

        position_title: row.position_title ?? null,
        affiliation: row.role_type ?? null,

        start_date: row.effective_start_date ?? null,
        end_date: row.effective_end_date ?? null,

        is_active: row.active_flag === true,
        is_travel_tech: false,

        is_field: row.is_field === true,
        is_leadership: row.is_leadership === true,
        is_incomplete: row.is_incomplete === true,

        schedule: null,
      };
    });
}