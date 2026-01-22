// apps/web/src/app/api/org/leadership/route.ts

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

type SetBody = {
  action: "set";
  child_assignment_id: string;
  parent_assignment_id: string;
  start_date: string; // YYYY-MM-DD
};

type Body = SetBody;

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

    const pc_org_id = selected.selected_pc_org_id;
    const body = (await req.json()) as Partial<Body>;

    if (body.action !== "set") {
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }

    const child_assignment_id = String((body as any).child_assignment_id ?? "").trim();
    const parent_assignment_id = String((body as any).parent_assignment_id ?? "").trim();
    const start_date = String((body as any).start_date ?? "").trim();

    if (!child_assignment_id || !parent_assignment_id || !start_date) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (child_assignment_id === parent_assignment_id) {
      return NextResponse.json({ ok: false, error: "child_and_parent_cannot_match" }, { status: 400 });
    }

    const svc = getServiceClient();

    // Ensure both assignments exist + belong to selected pc_org_id (scope enforcement)
    const { data: childRow, error: childErr } = await svc
      .from("assignment")
      .select("assignment_id, pc_org_id")
      .eq("assignment_id", child_assignment_id)
      .maybeSingle();

    if (childErr) return NextResponse.json({ ok: false, error: childErr.message }, { status: 500 });
    if (!childRow?.assignment_id) return NextResponse.json({ ok: false, error: "child_assignment_not_found" }, { status: 404 });
    if (childRow.pc_org_id !== pc_org_id) return NextResponse.json({ ok: false, error: "child_out_of_scope" }, { status: 403 });

    const { data: parentRow, error: parentErr } = await svc
      .from("assignment")
      .select("assignment_id, pc_org_id")
      .eq("assignment_id", parent_assignment_id)
      .maybeSingle();

    if (parentErr) return NextResponse.json({ ok: false, error: parentErr.message }, { status: 500 });
    if (!parentRow?.assignment_id) return NextResponse.json({ ok: false, error: "parent_assignment_not_found" }, { status: 404 });
    if (parentRow.pc_org_id !== pc_org_id) return NextResponse.json({ ok: false, error: "parent_out_of_scope" }, { status: 403 });

    // Close any currently-active edge for the child (end_date is nullable)
    const { error: closeErr } = await svc
      .from("assignment_reporting")
      .update({ end_date: start_date })
      .eq("child_assignment_id", child_assignment_id)
      .is("end_date", null);

    if (closeErr) {
      return NextResponse.json(
        { ok: false, error: closeErr.message, code: (closeErr as any).code ?? null, details: (closeErr as any).details ?? null, hint: (closeErr as any).hint ?? null },
        { status: 500 }
      );
    }

    // Insert new edge
    const { data: inserted, error: insErr } = await svc
      .from("assignment_reporting")
      .insert([{ child_assignment_id, parent_assignment_id, start_date, end_date: null }])
      .select("assignment_reporting_id")
      .single();

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message, code: (insErr as any).code ?? null, details: (insErr as any).details ?? null, hint: (insErr as any).hint ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, assignment_reporting_id: inserted.assignment_reporting_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
