import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // signed-in gate
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const pc_org_id = String(url.searchParams.get("pc_org_id") ?? "").trim();
  if (!pc_org_id) return NextResponse.json({ error: "pc_org_id is required" }, { status: 400 });

  const admin = supabaseAdmin();

  // Pull offices via pc_org_office relationship, then filter to active=true (soft-close support)
  const { data, error } = await admin
    .from("pc_org_office")
    .select(
      `
      office:office_id (
        office_id,
        office_name,
        active
      )
    `
    )
    .eq("pc_org_id", pc_org_id)
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows =
    (data ?? [])
      .map((r: any) => r?.office)
      .filter(Boolean)
      .filter((o: any) => o.active !== false) // active-only (default true)
      .map((o: any) => ({
        id: String(o.office_id),
        label: String(o.office_name ?? o.office_id),
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })) ?? [];

  return NextResponse.json({ rows });
}