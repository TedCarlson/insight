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
    const body = (await req.json()) as Record<string, unknown>;

    const office_name = String(body.office_name ?? "").trim();
    const addressRaw = String(body.address ?? "").trim();
    const subRegionRaw = String(body.sub_region ?? "").trim();

    if (!office_name) return NextResponse.json({ error: "office_name is required" }, { status: 400 });

    const admin = supabaseAdmin();

    const { error } = await admin
      .from("office")
      .update({
        office_name,
        address: addressRaw ? addressRaw : null,
        sub_region: subRegionRaw ? subRegionRaw : null,
      })
      .eq("office_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}