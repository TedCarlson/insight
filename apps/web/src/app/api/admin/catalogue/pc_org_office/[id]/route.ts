import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function boolish(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(s)) return true;
    if (["false", "0", "no", "n", "off"].includes(s)) return false;
  }
  return fallback;
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
    const body = (await req.json()) as {
      pc_org_id?: unknown;
      office_id?: unknown;
      is_primary?: unknown;
      office_notes?: unknown;
    };

    // Allow updating ONLY the fields we explicitly support for this table.
    const patch: Record<string, unknown> = {};

    if (body.pc_org_id != null) patch.pc_org_id = String(body.pc_org_id).trim() || null;
    if (body.office_id != null) patch.office_id = String(body.office_id).trim() || null;

    if (body.is_primary != null) patch.is_primary = boolish(body.is_primary, false);

    if (body.office_notes != null) {
      const s = String(body.office_notes).trim();
      patch.office_notes = s ? s : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No supported fields to update" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Supports either:
    //  - pk: pc_org_office_id
    //  - composite encoding "pc_org_id::office_id" (optional)
    let q = admin.from("pc_org_office").update(patch);

    if (id.includes("::")) {
      const [pc_org_id, office_id] = id.split("::");
      q = q.eq("pc_org_id", pc_org_id).eq("office_id", office_id);
    } else {
      q = q.eq("pc_org_office_id", id);
    }

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}