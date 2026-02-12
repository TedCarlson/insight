// apps/web/src/app/api/metrics/report-kpis/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = await supabaseServer();
  const selectedPcOrgId = scope.selected_pc_org_id;

  const { searchParams } = new URL(req.url);

  const pc_org_id = searchParams.get("pc_org_id") ?? "";
  const entity = searchParams.get("entity") ?? "";
  const classType = (searchParams.get("class") ?? "").toUpperCase();
  const entityType = (searchParams.get("entity_type") ?? "").toUpperCase();
  const fiscal = searchParams.get("fiscal") ?? "";

  if (!pc_org_id || !entity || !classType || !entityType || !fiscal) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  // Enforce scope: request pc_org_id MUST match selected org
  if (pc_org_id !== selectedPcOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await sb
    .from("score_kpi")
    .select("*")
    .eq("pc_org_id", pc_org_id)
    .eq("class_type", classType)
    .eq("entity_type", entityType)
    .eq("fiscal_end_date", fiscal)
    .eq("entity_id", entity)
    .order("kpi_key", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load KPI breakdown" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}