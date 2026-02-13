// apps/web/src/app/api/admin/metrics-colors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

const TABLE = "metrics_band_style_selection";
const GLOBAL_SELECTION_KEY = "GLOBAL";

// -------------------------------------------------------------
// Owner Gate (auth via session client)
// -------------------------------------------------------------
async function ownerGate() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return { ok: false as const, sb, status: 401, error: "Unauthorized" };
  }

  const { data: isOwner, error } = await sb.rpc("is_owner");
  if (error || !isOwner) {
    return { ok: false as const, sb, status: 403, error: "Forbidden" };
  }

  return { ok: true as const };
}

// -------------------------------------------------------------
// GET — return active preset key (global row)
// -------------------------------------------------------------
export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  // IMPORTANT: supabaseAdmin is a FUNCTION in this repo, so call it.
  const admin = await supabaseAdmin();

  const { data, error } = await admin
    .from(TABLE)
    .select("preset_key,selection_key")
    .eq("selection_key", GLOBAL_SELECTION_KEY)
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
// POST — overwrite global selection (delete+insert avoids PK-update issues)
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = await supabaseAdmin();

  const body = await req.json().catch(() => null);
  const presetKey = String(body?.preset_key ?? "").trim();

  if (!presetKey) {
    return NextResponse.json({ error: "Missing preset_key" }, { status: 400 });
  }

  // Clear existing GLOBAL row (if any)
  const { error: delErr } = await admin.from(TABLE).delete().eq("selection_key", GLOBAL_SELECTION_KEY);

  if (delErr) {
    console.error("Selection delete error:", delErr);
    return NextResponse.json({ error: "Failed to clear selection" }, { status: 500 });
  }

  // Insert new GLOBAL row
  const { error: insErr } = await admin.from(TABLE).insert([
    {
      selection_key: GLOBAL_SELECTION_KEY,
      preset_key: presetKey,
      updated_at: new Date().toISOString(),
    },
  ]);

  if (insErr) {
    console.error("Selection save error:", insErr);
    return NextResponse.json({ error: "Failed to save selection" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activePresetKey: presetKey });
}