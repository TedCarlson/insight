import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { computeRubricDefaults } from "@/features/metrics-admin/lib/spillDefaults";

export const runtime = "nodejs";

async function ownerGate() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user)
    return { ok: false as const, sb, status: 401, error: "Unauthorized" };

  const { data: isOwner, error: ownerError } = await sb.rpc("is_owner");

  if (ownerError || !isOwner)
    return { ok: false as const, sb, status: 403, error: "Forbidden" };

  return { ok: true as const, sb };
}

// -----------------------------------------------------
// GET
// -----------------------------------------------------
export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok)
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );

  const sb = gate.sb;

  const { data: kpiDefs } = await sb
    .from("metrics_kpi_def")
    .select("*")
    .order("kpi_key", { ascending: true });

  const { data: classConfig } = await sb
    .from("metrics_class_kpi_config")
    .select("*")
    .order("class_type", { ascending: true })
    .order("kpi_key", { ascending: true });

  const { data: rubricRows } = await sb
    .from("metrics_class_kpi_rubric")
    .select("*")
    .order("class_type", { ascending: true })
    .order("kpi_key", { ascending: true })
    .order("band_key", { ascending: true });

  return NextResponse.json({
    kpiDefs: kpiDefs ?? [],
    classConfig: classConfig ?? [],
    rubricRows: rubricRows ?? [],
  });
}

// -----------------------------------------------------
// POST
// -----------------------------------------------------
export async function POST(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok)
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );

  const sb = gate.sb;
  const body = await req.json().catch(() => null);
  const op = body?.op;

  // -----------------------------------------------------
  // SAVE GRID
  // -----------------------------------------------------
  if (op === "SAVE_GRID") {
    const payload = body?.payload;
    if (!payload)
      return NextResponse.json(
        { error: "Missing payload" },
        { status: 400 }
      );

    // KPI defs
    if (Array.isArray(payload.kpiDefs) && payload.kpiDefs.length) {
      await sb
        .from("metrics_kpi_def")
        .upsert(
          payload.kpiDefs.map((d: any) => ({
            kpi_key: d.kpi_key,
            label: d.label ?? null,
            customer_label: d.customer_label ?? null,
          })),
          { onConflict: "kpi_key" }
        );
    }

    // Class config
    if (Array.isArray(payload.classConfig) && payload.classConfig.length) {
      await sb
        .from("metrics_class_kpi_config")
        .upsert(
          payload.classConfig.map((c: any) => ({
            class_type: c.class_type,
            kpi_key: c.kpi_key,
            enabled: !!c.enabled,
            weight_percent: c.weight_percent ?? null,
            threshold: c.threshold ?? null,
            grade_value: c.grade_value ?? null,
          })),
          { onConflict: "class_type,kpi_key" }
        );
    }

    // Rubric
    if (Array.isArray(payload.rubricRows) && payload.rubricRows.length) {
      await sb
        .from("metrics_class_kpi_rubric")
        .upsert(
          payload.rubricRows.map((r: any) => ({
            class_type: r.class_type,
            kpi_key: r.kpi_key,
            band_key: r.band_key,
            min_value: r.min_value ?? null,
            max_value: r.max_value ?? null,
            score_value: r.score_value ?? null,
          })),
          { onConflict: "class_type,kpi_key,band_key" }
        );
    }
  }

  // -----------------------------------------------------
  // LOAD DEFAULTS
  // -----------------------------------------------------
  if (op === "LOAD_DEFAULTS") {
    const p = body?.payload;

    if (!p?.classType || !p?.kpiKey || !p?.kpiDef || !p?.classConfig) {
      return NextResponse.json(
        { error: "Missing load-defaults payload" },
        { status: 400 }
      );
    }

    const classType = String(p.classType).toUpperCase();
    const kpiKey = String(p.kpiKey);

    const computed = computeRubricDefaults({
      def: {
        min_value: p.kpiDef.min_value ?? null,
        max_value: p.kpiDef.max_value ?? null,
        unit: p.kpiDef.unit ?? null,
        direction: p.kpiDef.direction ?? "HIGHER_BETTER",
      },
      threshold: p.classConfig.threshold,
      grade_value: p.classConfig.grade_value ?? null,
    });

    await sb
      .from("metrics_class_kpi_rubric")
      .upsert(
        Object.entries(computed).map(([band_key, r]: any) => ({
          class_type: classType,
          kpi_key: kpiKey,
          band_key,
          min_value: r.min_value ?? null,
          max_value: r.max_value ?? null,
          score_value: r.score_value ?? null,
        })),
        { onConflict: "class_type,kpi_key,band_key" }
      );
  }

  // Always return fresh snapshot
  const [kpiSnap, cfgSnap, rubSnap] = await Promise.all([
    sb.from("metrics_kpi_def").select("*").order("kpi_key"),
    sb.from("metrics_class_kpi_config")
      .select("*")
      .order("class_type")
      .order("kpi_key"),
    sb.from("metrics_class_kpi_rubric")
      .select("*")
      .order("class_type")
      .order("kpi_key")
      .order("band_key"),
  ]);

  return NextResponse.json({
    kpiDefs: kpiSnap.data ?? [],
    classConfig: cfgSnap.data ?? [],
    rubricRows: rubSnap.data ?? [],
  });
}