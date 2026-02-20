// RUN THIS
// Replace the entire file:
// apps/web/src/app/api/metrics/metrics-report-kpis/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET(req: NextRequest) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) {
    return json(401, { error: "Unauthorized" });
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
    return json(400, { error: "Missing required params" });
  }

  if (pc_org_id !== selectedPcOrgId) {
    return json(403, { error: "Forbidden" });
  }

  const { data: isOwner, error: ownerErr } = await sb.rpc("is_owner");
  if (ownerErr) {
    return json(403, { error: "Forbidden", detail: ownerErr.message });
  }

  if (!isOwner) {
    const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;

    const { data: allowed, error: permErr } = await apiClient.rpc("has_any_pc_org_permission", {
      p_pc_org_id: pc_org_id,
      p_permission_keys: ["metrics_manage", "roster_manage"],
    });

    if (permErr) {
      return json(403, { error: "Forbidden", detail: permErr.message });
    }

    if (!allowed) {
      return json(403, {
        error: "Forbidden",
        required_any_of: ["metrics_manage", "roster_manage"],
      });
    }
  }

  // 🔥 NEW SOURCE: ARCHIVE SNAPSHOT
  const { data, error } = await sb
    .from("master_kpi_archive_snapshot")
    .select("*")
    .eq("pc_org_id", pc_org_id)
    .eq("class_type", classType)
    .eq("fiscal_end_date", fiscal)
    .eq("tech_id", entity)
    .order("kpi_key", { ascending: true });

  if (error) {
    return json(500, { error: "Failed to load KPI breakdown", detail: error.message });
  }

  return json(200, data ?? []);
}