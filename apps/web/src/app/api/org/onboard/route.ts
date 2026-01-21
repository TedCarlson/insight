import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE service env");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

type Body = {
  full_name: string;
  email?: string | null;
  mobile?: string | null;

  // employer selection
  co_ref_id: string; // uuid
  co_code: string; // 3-char employer code (company_code / contractor_code)
  employer_type: "company" | "contractor"; // discriminator (NOT stored as co_code)

  // remaining human fields (Add Person overlay)
  active?: boolean | null;
  role?: string | null;
  fuse_emp_id?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  person_notes?: string | null;
};

function deriveRoleFromEmployerType(employer_type: Body["employer_type"]) {
  // matches DB CHECK: role in ('Hires','Contractors')
  return employer_type === "contractor" ? "Contractors" : "Hires";
}

export async function POST(req: Request) {
  try {
    const selected = await requireSelectedPcOrgServer();
    if (!selected.ok) {
      return NextResponse.json(
        { ok: false, error: selected.reason },
        { status: selected.reason === "not_authenticated" ? 401 : 400 }
      );
    }

    const sb = await supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<Body>;

    const full_name = body.full_name?.trim();
    const email = body.email?.trim() || null;
    const mobile = body.mobile?.trim() || null;

    const co_ref_id = body.co_ref_id?.trim();
    const co_code = body.co_code?.trim(); // 3-char code
    const employer_type = body.employer_type;

    if (
      !full_name ||
      !co_ref_id ||
      !co_code ||
      (employer_type !== "company" && employer_type !== "contractor")
    ) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_fields" }, { status: 400 });
    }

    const roleDefault = deriveRoleFromEmployerType(employer_type);
    const nextRole =
      typeof body.role === "string" && body.role.trim().length > 0 ? body.role.trim() : roleDefault;

    const active = typeof body.active === "boolean" ? body.active : true;

    const svc = getServiceClient();

    const { data, error } = await svc
      .from("person")
      .insert({
        full_name,
        emails: email, // DB column is text; UI treats as unknown
        mobile,

        // employer
        co_ref_id,
        co_code, // <-- STORE 3-char employer code

        // human fields
        role: nextRole,
        active,
        fuse_emp_id: body.fuse_emp_id?.trim() || null,
        person_nt_login: body.person_nt_login?.trim() || null,
        person_csg_id: body.person_csg_id?.trim() || null,
        person_notes: body.person_notes?.trim() || null,
      })
      .select("person_id,full_name,emails,mobile,active,role")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Shape to match UnassignedPersonRow (from v_people_unassigned)
    const person = {
      person_id: data.person_id,
      full_name: data.full_name,
      emails: data.emails,
      mobile: data.mobile,
      person_active: data.active,
      person_role: data.role,
    };

    return NextResponse.json({ ok: true, person });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
