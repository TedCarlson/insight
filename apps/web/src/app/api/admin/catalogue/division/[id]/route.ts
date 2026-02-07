import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = (await req.json()) as { division_name?: unknown; division_code?: unknown };

    const patch: Record<string, unknown> = {};
    if (body.division_name != null) patch.division_name = String(body.division_name).trim();
    if (body.division_code != null) patch.division_code = String(body.division_code).trim();

    const admin = supabaseAdmin();
    const { error } = await admin.from("division").update(patch).eq("division_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}