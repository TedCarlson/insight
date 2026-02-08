import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // signed-in gate
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = (await req.json()) as { mso_name?: unknown; mso_lob?: unknown };

    const patch: Record<string, unknown> = {};
    if (body.mso_name != null) patch.mso_name = String(body.mso_name).trim();
    if (body.mso_lob != null) patch.mso_lob = String(body.mso_lob).trim().toUpperCase();

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

    const admin = supabaseAdmin();
    const { error } = await admin.from("mso").update(patch).eq("mso_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}