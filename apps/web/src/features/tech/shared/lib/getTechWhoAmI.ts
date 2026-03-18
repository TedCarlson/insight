import { getTechShellContext } from "@/features/tech/lib/getTechShellContext";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

type PersonRow = {
  full_name: string | null;
  role: string | null;
  co_ref_id: string | null;
};

type AssignmentRow = {
  tech_id: string | null;
};

type CompanyRow = {
  company_name: string | null;
};

type ContractorRow = {
  contractor_name: string | null;
};

type WhoAmI = {
  full_name: string | null;
  tech_id: string | null;
  affiliation: string | null;
};

export async function getTechWhoAmI(): Promise<WhoAmI> {
  const shell = await getTechShellContext();

  if (!shell.ok || !shell.person_id || !shell.pc_org_id || !shell.assignment_id) {
    return {
      full_name: null,
      tech_id: null,
      affiliation: null,
    };
  }

  const admin = supabaseAdmin();

  const [{ data: personRow, error: personError }, { data: assignmentRow, error: assignmentError }] =
    await Promise.all([
      admin
        .from("person")
        .select("full_name, role, co_ref_id")
        .eq("person_id", shell.person_id)
        .maybeSingle<PersonRow>(),
      admin
        .from("assignment")
        .select("tech_id")
        .eq("pc_org_id", shell.pc_org_id)
        .eq("assignment_id", shell.assignment_id)
        .maybeSingle<AssignmentRow>(),
    ]);

  if (personError) {
    throw new Error(`person lookup failed: ${personError.message}`);
  }

  if (assignmentError) {
    throw new Error(`assignment lookup failed: ${assignmentError.message}`);
  }

  const full_name = personRow?.full_name ?? null;
  const tech_id = assignmentRow?.tech_id ?? null;

  let affiliation: string | null = null;

  const role = String(personRow?.role ?? "").toLowerCase();
  const co_ref_id = String(personRow?.co_ref_id ?? "").trim() || null;

  if (co_ref_id) {
    if (role.includes("contract")) {
      const { data: contractorRow, error: contractorError } = await admin
        .from("contractor")
        .select("contractor_name")
        .eq("contractor_id", co_ref_id)
        .maybeSingle<ContractorRow>();

      if (contractorError) {
        throw new Error(`contractor lookup failed: ${contractorError.message}`);
      }

      affiliation = contractorRow?.contractor_name ?? null;
    } else {
      const { data: companyRow, error: companyError } = await admin
        .from("company")
        .select("company_name")
        .eq("company_id", co_ref_id)
        .maybeSingle<CompanyRow>();

      if (companyError) {
        throw new Error(`company lookup failed: ${companyError.message}`);
      }

      affiliation = companyRow?.company_name ?? null;
    }
  }

  return {
    full_name,
    tech_id,
    affiliation,
  };
}