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
    const body = (await req.json()) as { region_name?: unknown; region_code?: unknown };

    const patch: Record<string, unknown> = {};
    if (body.region_name != null) patch.region_name = String(body.region_name).trim();
    if (body.region_code != null) patch.region_code = String(body.region_code).trim();

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

    const admin = supabaseAdmin();
    const { error } = await admin.from("region").update(patch).eq("region_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}  