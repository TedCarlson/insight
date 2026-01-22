// apps/web/src/app/api/org/assignment/route.ts

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

  // optional (server will enforce selected pc_org_id anyway)
  pc_org_id?: string;

  tech_id?: string | null;
  position_title?: string | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null;   // YYYY-MM-DD
};

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
    if (!person_id) {
      return NextResponse.json({ ok: false, error: "missing_person_id" }, { status: 400 });
    }

    const pc_org_id = selected.selected_pc_org_id;

    // Optional safety: if client sent pc_org_id, enforce it matches selected pc_org_id
    if (body.pc_org_id && body.pc_org_id.trim() && body.pc_org_id.trim() !== pc_org_id) {
      return NextResponse.json({ ok: false, error: "pc_org_mismatch" }, { status: 400 });
    }

    const svc = getServiceClient();

    // Enforce step order: membership must exist first
    const { data: membership, error: memErr } = await svc
      .from("person_pc_org")
      .select("person_pc_org_id")
      .eq("person_id", person_id)
      .eq("pc_org_id", pc_org_id)
      .maybeSingle();

    if (memErr) {
      return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
    }
    if (!membership?.person_pc_org_id) {
      return NextResponse.json({ ok: false, error: "membership_required_first" }, { status: 409 });
    }

    const payload: Record<string, any> = {
      person_id,
      pc_org_id,
      tech_id: typeof body.tech_id === "string" ? body.tech_id.trim() || null : null,
      position_title: typeof body.position_title === "string" ? body.position_title.trim() || null : null,
      start_date: typeof body.start_date === "string" ? body.start_date.trim() || null : null,
      end_date: typeof body.end_date === "string" ? body.end_date.trim() || null : null,
    };

    const { data: inserted, error: insErr } = await svc
      .from("assignment")
      .insert(payload)
      .select("assignment_id")
      .single();

    if (insErr) {
      return NextResponse.json(
        {
          ok: false,
          error: insErr.message,
          // helpful for debugging constraints/triggers
          details: (insErr as any).details ?? null,
          hint: (insErr as any).hint ?? null,
          code: (insErr as any).code ?? null,
        },
        { status: 500 }
      );
    }

    // Rehydrate roster row (matches membership route convention)
    const ROSTER_SELECT =
      "person_pc_org_id,person_id,pc_org_id,full_name,person_role,person_active,membership_status,membership_active,position_title,assignment_id,assignment_active" as const;

    const { data: roster_row, error: rosterErr } = await svc
      .from("v_roster_active")
      .select(ROSTER_SELECT)
      .eq("person_id", person_id)
      .eq("pc_org_id", pc_org_id)
      .maybeSingle();

    if (rosterErr || !roster_row) {
      // Assignment was created, but view hydration failed (non-fatal for creation, but we surface it)
      return NextResponse.json(
        {
          ok: true,
          assignment_id: inserted.assignment_id,
          roster_row: null,
          warning: rosterErr?.message ?? "failed_to_rehydrate_roster_row",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      assignment_id: inserted.assignment_id,
      roster_row,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
