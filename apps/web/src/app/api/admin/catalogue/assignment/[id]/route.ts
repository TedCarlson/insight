import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function strOrNull(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // signed-in gate
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};

    if ("tech_id" in body) patch.tech_id = strOrNull(body.tech_id);
    if ("start_date" in body) patch.start_date = strOrNull(body.start_date);
    if ("end_date" in body) patch.end_date = strOrNull(body.end_date);
    if ("position_title" in body) patch.position_title = strOrNull(body.position_title);
    if ("active" in body) patch.active = body.active == null ? null : Boolean(body.active);

    // NEW
    if ("office_id" in body) patch.office_id = strOrNull(body.office_id);

    // (Optional: allow admin to move assignment across org/person later)
    // if ("person_id" in body) patch.person_id = strOrNull(body.person_id);
    // if ("pc_org_id" in body) patch.pc_org_id = strOrNull(body.pc_org_id);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { error } = await admin.from("assignment").update(patch).eq("assignment_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}