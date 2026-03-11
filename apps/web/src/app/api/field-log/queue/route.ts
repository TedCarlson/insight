import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const pcOrgId = req.nextUrl.searchParams.get("pc_org_id")?.trim() || null;
  const status = req.nextUrl.searchParams.get("status")?.trim() || null;
  const categoryKey = req.nextUrl.searchParams.get("categoryKey")?.trim() || null;
  const jobNumber = req.nextUrl.searchParams.get("jobNumber")?.trim() || null;

  if (!pcOrgId) {
    return NextResponse.json(
      { ok: false, error: "pc_org_id is required." },
      { status: 400 },
    );
  }

  try {
    await requireAccessPass(req, pcOrgId);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Forbidden" },
      { status: err?.status || 403 },
    );
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("field_log_get_review_queue", {
    p_pc_org_id: pcOrgId,
    p_status: status,
    p_category_key: categoryKey,
    p_job_number: jobNumber,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to load Field Log review queue.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: data ?? [],
  });
}