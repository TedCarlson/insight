 // apps/web/src/app/api/org/membership/route.ts

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
  person_id: string;

  // employer selection
  co_ref_id: string; // uuid
  co_code: string; // 3-char employer code (company_code/contractor_code)
  employer_type: "company" | "contractor"; // discriminator (NOT stored as co_code)

  // optional human fields
  active?: boolean | null;
  role?: string | null;

  // optional additional human fields (drawer shows them)
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

    const person_id = body.person_id?.trim();
    const co_ref_id = body.co_ref_id?.trim();
    const co_code = body.co_code?.trim(); // 3-char code
    const employer_type = body.employer_type;

    if (
      !person_id ||
      !co_ref_id ||
      !co_code ||
      (employer_type !== "company" && employer_type !== "contractor")
    ) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_fields" }, { status: 400 });
    }

    const pc_org_id = selected.selected_pc_org_id;
    const svc = getServiceClient();

    // Prevent duplicate active membership for same person+org
    const { data: existing, error: existErr } = await svc
      .from("person_pc_org")
      .select("person_pc_org_id")
      .eq("person_id", person_id)
      .eq("pc_org_id", pc_org_id)
      .eq("active", true)
      .maybeSingle();

    if (existErr) {
      return NextResponse.json({ ok: false, error: existErr.message }, { status: 500 });
    }
    if (existing?.person_pc_org_id) {
      return NextResponse.json(
        { ok: false, error: "membership_already_exists", person_pc_org_id: existing.person_pc_org_id },
        { status: 409 }
      );
    }

    // 1) Update person employer + human fields (required for downstream workflow)
    const roleDefault = deriveRoleFromEmployerType(employer_type);
    const nextRole =
      typeof body.role === "string" && body.role.trim().length > 0 ? body.role.trim() : roleDefault;

    const updatePayload: Record<string, any> = {
      co_ref_id,
      co_code, // <-- STORE 3-char employer code
      role: nextRole,
    };

    if (typeof body.active === "boolean") updatePayload.active = body.active;

    if (typeof body.fuse_emp_id === "string") updatePayload.fuse_emp_id = body.fuse_emp_id.trim() || null;
    if (typeof body.person_nt_login === "string")
      updatePayload.person_nt_login = body.person_nt_login.trim() || null;
    if (typeof body.person_csg_id === "string") updatePayload.person_csg_id = body.person_csg_id.trim() || null;
    if (typeof body.person_notes === "string") updatePayload.person_notes = body.person_notes.trim() || null;

    const { error: updErr } = await svc.from("person").update(updatePayload).eq("person_id", person_id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    // 2) Create membership row (defaults: status='pending', active=true)
    const { data: inserted, error: insErr } = await svc
      .from("person_pc_org")
      .insert({ person_id, pc_org_id })
      .select("person_pc_org_id")
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    // 3) Rehydrate roster row from view
    const ROSTER_SELECT =
      "person_pc_org_id,person_id,pc_org_id,full_name,person_role,person_active,membership_status,membership_active,position_title,assignment_id,assignment_active" as const;

    const { data: roster_row, error: rosterErr } = await svc
      .from("v_roster_active")
      .select(ROSTER_SELECT)
      .eq("person_pc_org_id", inserted.person_pc_org_id)
      .maybeSingle();

    if (rosterErr || !roster_row) {
      return NextResponse.json(
        { ok: false, error: rosterErr?.message ?? "failed_to_rehydrate_roster_row" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, roster_row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
