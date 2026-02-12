import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

const TABLE = "metrics_band_style_selection";

// -------------------------------------------------------------
// Owner Gate
// -------------------------------------------------------------
async function ownerGate() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return { ok: false as const, sb, status: 401, error: "Unauthorized" };
  }

  const { data: isOwner } = await sb.rpc("is_owner");

  if (!isOwner) {
    return { ok: false as const, sb, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, sb };
}

// -------------------------------------------------------------
// GET — return active preset key
// -------------------------------------------------------------
export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { sb } = gate;

  const { data, error } = await sb
    .from(TABLE)
    .select("preset_key")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Selection load error:", error);
    return NextResponse.json({ error: "Failed to load selection" }, { status: 500 });
  }

  return NextResponse.json({
    activePresetKey: data?.preset_key ?? null,
  });
}

// -------------------------------------------------------------
// POST — overwrite preset
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { sb } = gate;

  const body = await req.json().catch(() => null);

  if (!body?.preset_key) {
    return NextResponse.json({ error: "Missing preset_key" }, { status: 400 });
  }

  // Clear table (global only = one row ever)
  const { error: deleteError } = await sb.from(TABLE).delete().neq("preset_key", "");

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ error: "Failed to clear selection" }, { status: 500 });
  }

  const { error: insertError } = await sb.from(TABLE).insert([
    { preset_key: body.preset_key },
  ]);

  if (insertError) {
    console.error(insertError);
    return NextResponse.json({ error: "Failed to save selection" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}