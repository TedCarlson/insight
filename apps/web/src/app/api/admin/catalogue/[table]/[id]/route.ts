import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

// Keep this aligned with your catalogue tables
const TABLE_ALLOWLIST = new Set<string>([
  "pc_org",
  "pc",
  "mso",
  "division",
  "region",
  "fulfillment_center",
  // add more as you enable them
]);

// Primary key column per table (not all are "id")
const PK_BY_TABLE: Record<string, string> = {
  pc_org: "pc_org_id",
  pc: "pc_id",
  mso: "mso_id",
  division: "division_id",
  region: "region_id",
  fulfillment_center: "fulfillment_center_id",
};

// Editable columns per table (early-stage safe model)
// NOTE: pc_org_id is SYSTEM OWNED and intentionally excluded.
const EDITABLE_BY_TABLE: Record<string, string[]> = {
  pc_org: [
    "pc_org_name",
    "fulfillment_center_id",
    "fulfillment_center_name",
    "pc_id",
    "mso_id",
    "division_id",
    "region_id",
  ],

  // You can expand these later; keeping tight for now.
  pc: ["pc_number"],
  mso: ["mso_name", "mso_lob"],
  division: ["division_name", "division_code"],
  region: ["region_name", "region_code"],
  fulfillment_center: ["fulfillment_center_name"],
};

function pickAllowedPatch(table: string, body: Record<string, unknown>) {
  const allowed = new Set(EDITABLE_BY_TABLE[table] ?? []);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ table: string; id: string }> }
) {
  // signed-in gate (admin auth checks can be added later via your guest list)
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, id } = await context.params;

  if (!TABLE_ALLOWLIST.has(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const pk = PK_BY_TABLE[table];
  if (!pk) {
    return NextResponse.json({ error: "Missing PK mapping for table" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const patch = pickAllowedPatch(table, body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { error } = await admin.from(table).update(patch).eq(pk, id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}