import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { hasCapability } from "@/shared/access/access";
import { CAP } from "@/shared/access/capabilities";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function asAccessError(err: unknown) {
  const status = (err as any)?.status ?? 500;
  const message = String((err as any)?.message ?? "server_error");

  if (status === 401) return json(401, { error: "Unauthorized" });
  if (status === 403) return json(403, { error: "Forbidden" });
  if (status === 400) return json(400, { error: message });

  return json(500, { error: "server_error" });
}

export async function GET(req: NextRequest) {
  try {
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

    const pass = await requireAccessPass(req, pc_org_id);
    const allowed =
      hasCapability(pass, CAP.METRICS_MANAGE) ||
      hasCapability(pass, CAP.ROSTER_MANAGE);

    if (!allowed) {
      return json(403, {
        error: "Forbidden",
        required_any_of: ["metrics_manage", "roster_manage"],
      });
    }

    // Current repo behavior: entity_type is validated upstream by caller shape,
    // but the data source here is still tech-scoped archive snapshot.
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
  } catch (err) {
    return asAccessError(err);
  }
}