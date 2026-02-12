// apps/web/src/app/api/admin/metrics-report-preview/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

type ClassType = "P4P" | "SMART" | "TECH";

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

  return { ok: true as const, sb };
}

function toClassType(v: string | null): ClassType | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "P4P" || s === "SMART" || s === "TECH") return s;
  return null;
}

/**
 * GET /api/admin/metrics-report-preview?class_type=SMART
 *
 * Returns:
 * - kpiDefs: metrics_kpi_def rows
 * - classConfig: metrics_class_kpi_config rows (optionally filtered to class_type)
 * - rubricRows: metrics_class_kpi_rubric rows (optionally filtered to class_type)
 *
 * NOTE:
 * Raw metric fact rows are NOT pulled here yet (we’ll wire to your ingestion tables once we confirm names).
 */
export async function GET(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const sb = gate.sb;

  const url = new URL(req.url);
  const classType = toClassType(url.searchParams.get("class_type"));

  const kpiQ = sb.from("metrics_kpi_def").select("*").order("kpi_key", { ascending: true });

  const cfgQ = sb
    .from("metrics_class_kpi_config")
    .select("*")
    .order("class_type", { ascending: true })
    .order("kpi_key", { ascending: true });

  const rubQ = sb
    .from("metrics_class_kpi_rubric")
    .select("*")
    .order("class_type", { ascending: true })
    .order("kpi_key", { ascending: true })
    .order("band_key", { ascending: true });

  const [kpiRes, cfgRes, rubRes] = await Promise.all([kpiQ, cfgQ, rubQ]);

  if (kpiRes.error) {
    console.error("report-preview: kpiDefs load error:", kpiRes.error);
    return NextResponse.json({ error: "Failed to load KPI defs" }, { status: 500 });
  }
  if (cfgRes.error) {
    console.error("report-preview: classConfig load error:", cfgRes.error);
    return NextResponse.json({ error: "Failed to load class config" }, { status: 500 });
  }
  if (rubRes.error) {
    console.error("report-preview: rubric load error:", rubRes.error);
    return NextResponse.json({ error: "Failed to load rubric" }, { status: 500 });
  }

  const classConfig = classType
    ? (cfgRes.data ?? []).filter((r: any) => String(r?.class_type ?? "").toUpperCase() === classType)
    : cfgRes.data ?? [];

  const rubricRows = classType
    ? (rubRes.data ?? []).filter((r: any) => String(r?.class_type ?? "").toUpperCase() === classType)
    : rubRes.data ?? [];

  return NextResponse.json({
    classType: classType ?? null,
    kpiDefs: kpiRes.data ?? [],
    classConfig,
    rubricRows,
    metricRows: [], // placeholder until we wire to your fact tables
  });
}