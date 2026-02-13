// apps/web/src/app/api/admin/metrics-config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { computeRubricDefaults } from "@/features/metrics-admin/lib/spillDefaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

// -----------------------------------------------------
// AUTH GATE
// -----------------------------------------------------

async function ownerGate() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return { ok: false as const, sb, status: 401, error: "Unauthorized" };

  const { data: isOwner, error: ownerError } = await sb.rpc("is_owner");
  if (ownerError || !isOwner) return { ok: false as const, sb, status: 403, error: "Forbidden" };

  return { ok: true as const, sb, user };
}

// -----------------------------------------------------

function str(v: unknown) {
  return String(v ?? "").trim();
}

function upper(v: unknown) {
  return str(v).toUpperCase();
}

function numOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// -----------------------------------------------------
// SESSION PC ORG (still required)
// -----------------------------------------------------

async function resolvePcOrgIdFromSession(sb: any, authUserId: string): Promise<string | null> {
  const { data: prof, error } = await sb
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) return null;
  const pc = prof?.selected_pc_org_id ? String(prof.selected_pc_org_id) : null;
  return pc && pc.trim() ? pc : null;
}

// -----------------------------------------------------
// SNAPSHOT (RUBRIC IS GLOBAL NOW)
// -----------------------------------------------------

async function fetchSnapshot(sb: any, pcOrgId: string) {
  const [kpiSnap, cfgSnap, rubSnap] = await Promise.all([
    sb.from("metrics_kpi_def").select("*").order("kpi_key", { ascending: true }),

    sb
      .from("metrics_class_kpi_config")
      .select("*")
      .order("class_type", { ascending: true })
      .order("kpi_key", { ascending: true }),

    sb
      .from("metrics_class_kpi_rubric")
      .select("*")
      .order("class_type", { ascending: true })
      .order("kpi_key", { ascending: true })
      .order("band_key", { ascending: true }),
  ]);

  return {
    kpiDefs: kpiSnap.data ?? [],
    classConfig: cfgSnap.data ?? [],
    rubricRows: rubSnap.data ?? [],
    _meta: {
      pc_org_id: pcOrgId,
    },
  };
}

// -----------------------------------------------------
// GET
// -----------------------------------------------------

export async function GET(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: NO_STORE_HEADERS });

  const sb = gate.sb;

  const pcOrgId = await resolvePcOrgIdFromSession(sb, gate.user.id);
  if (!pcOrgId) {
    return NextResponse.json(
      { error: "No PC Org selected", detail: "Select a PC Org in your session to use Metrics Admin." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const snap = await fetchSnapshot(sb, pcOrgId);
  return NextResponse.json(snap, { headers: NO_STORE_HEADERS });
}

// -----------------------------------------------------
// POST
// -----------------------------------------------------

export async function POST(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: NO_STORE_HEADERS });

  const sb = gate.sb;
  const body = await req.json().catch(() => null);
  const op = body?.op;

  const pcOrgId = await resolvePcOrgIdFromSession(sb, gate.user.id);
  if (!pcOrgId) {
    return NextResponse.json(
      { error: "No PC Org selected", detail: "Select a PC Org in your session to use Metrics Admin." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // =====================================================
  // SAVE GRID
  // =====================================================

  if (op === "SAVE_GRID") {
    const payload = body?.payload;
    if (!payload) return NextResponse.json({ error: "Missing payload" }, { status: 400, headers: NO_STORE_HEADERS });

    // -------------------------------------------------
    // KPI DEFINITIONS (preserve DB NOT NULL fields on partial edits)
    // -------------------------------------------------

    if (Array.isArray(payload.kpiDefs) && payload.kpiDefs.length) {
      const incoming = payload.kpiDefs
        .map((d: any) => ({
          kpi_key: str(d?.kpi_key),
          label: d?.label ?? undefined,
          customer_label: d?.customer_label ?? undefined,
          direction: d?.direction ?? undefined,
          unit: d?.unit ?? undefined,
          min_value: d?.min_value ?? undefined,
          max_value: d?.max_value ?? undefined,
          raw_label_identifier: d?.raw_label_identifier ?? undefined,
          no_data_behavior: d?.no_data_behavior ?? undefined,
        }))
        .filter((r: any) => r.kpi_key);

      if (incoming.length) {
        const keys = incoming.map((r: any) => r.kpi_key);

        const { data: existingRows, error: existingErr } = await sb
          .from("metrics_kpi_def")
          .select("kpi_key,label,customer_label,direction,unit,min_value,max_value,is_active,raw_label_identifier,no_data_behavior")
          .in("kpi_key", keys);

        if (existingErr) {
          return NextResponse.json(
            { error: "Failed to read existing KPI defs", detail: existingErr.message },
            { status: 500, headers: NO_STORE_HEADERS }
          );
        }

        const byKey = new Map<string, any>();
        for (const r of existingRows ?? []) byKey.set(String(r.kpi_key), r);

        const upRows = incoming.map((d: any) => {
          const prev = byKey.get(d.kpi_key);

          const label = d.label ?? prev?.label;
          const direction = d.direction ?? prev?.direction;
          const unit = d.unit ?? prev?.unit;

          if (!label || !direction || !unit) {
            throw new Error(`KPI def missing required fields for kpi_key=${d.kpi_key} (requires label, direction, unit).`);
          }

          return {
            kpi_key: d.kpi_key,
            label,
            customer_label: d.customer_label ?? prev?.customer_label ?? null,
            direction,
            unit,
            min_value: d.min_value ?? prev?.min_value ?? null,
            max_value: d.max_value ?? prev?.max_value ?? null,
            raw_label_identifier: d.raw_label_identifier ?? prev?.raw_label_identifier ?? null,
            no_data_behavior: d.no_data_behavior ?? prev?.no_data_behavior ?? null,
            is_active: prev?.is_active ?? true,
            updated_at: new Date().toISOString(),
          };
        });

        const { error: upErr } = await sb.from("metrics_kpi_def").upsert(upRows, { onConflict: "kpi_key" });
        if (upErr) {
          return NextResponse.json(
            { error: "Failed to upsert KPI defs", detail: upErr.message },
            { status: 500, headers: NO_STORE_HEADERS }
          );
        }
      }
    }

    // -------------------------------------------------
    // CLASS CONFIG
    // -------------------------------------------------

    if (Array.isArray(payload.classConfig) && payload.classConfig.length) {
      const rows = payload.classConfig
        .map((c: any) => {
          const class_type = upper(c?.class_type);
          const kpi_key = str(c?.kpi_key);
          if (!class_type || !kpi_key) return null;

          return {
            class_type,
            kpi_key,
            enabled: !!c?.enabled,
            weight: numOrNull(c?.weight_percent ?? c?.weight) ?? 0,
            threshold_value: numOrNull(c?.threshold ?? c?.threshold_value),
            grade_value: numOrNull(c?.grade_value),
            stretch_value: numOrNull(c?.stretch_value),
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (rows.length) {
        const { error } = await sb.from("metrics_class_kpi_config").upsert(rows, { onConflict: "class_type,kpi_key" });

        if (error) {
          return NextResponse.json(
            { error: "Failed to upsert class config", detail: error.message },
            { status: 500, headers: NO_STORE_HEADERS }
          );
        }
      }
    }

    // -------------------------------------------------
    // RUBRIC (GLOBAL)
    // -------------------------------------------------

    if (Array.isArray(payload.rubricRows) && payload.rubricRows.length) {
      const rows = payload.rubricRows
        .map((r: any) => {
          const class_type = upper(r?.class_type);
          const kpi_key = str(r?.kpi_key);
          const band_key = upper(r?.band_key);
          if (!class_type || !kpi_key || !band_key) return null;

          return {
            class_type,
            kpi_key,
            band_key,
            min_value: numOrNull(r?.min_value),
            max_value: numOrNull(r?.max_value),
            score_value: numOrNull(r?.score_value),
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (rows.length) {
        const { error } = await sb
          .from("metrics_class_kpi_rubric")
          .upsert(rows, { onConflict: "class_type,kpi_key,band_key" });

        if (error) {
          return NextResponse.json(
            { error: "Failed to upsert rubric rows", detail: error.message },
            { status: 500, headers: NO_STORE_HEADERS }
          );
        }
      }
    }
  }

  // =====================================================
  // LOAD DEFAULTS (writes to GLOBAL rubric)
  // =====================================================

  if (op === "LOAD_DEFAULTS") {
    const p = body?.payload;

    if (!p?.classType || !p?.kpiKey || !p?.kpiDef || !p?.classConfig) {
      return NextResponse.json({ error: "Missing load-defaults payload" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const classType = upper(p.classType);
    const kpiKey = str(p.kpiKey);

    const threshold = numOrNull(p.classConfig.threshold ?? p.classConfig.threshold_value);
    const grade_value = numOrNull(p.classConfig.grade_value);

    if (threshold === null) {
      return NextResponse.json(
        { error: "Missing threshold for load-defaults", detail: "threshold/threshold_value is required" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const computed = computeRubricDefaults({
      def: {
        min_value: p.kpiDef.min_value ?? null,
        max_value: p.kpiDef.max_value ?? null,
        unit: p.kpiDef.unit ?? null,
        direction: p.kpiDef.direction ?? "HIGHER_BETTER",
      },
      threshold,
      grade_value: grade_value ?? null,
    });

    const rows = Object.entries(computed).map(([band_key, r]: any) => ({
      class_type: classType,
      kpi_key: kpiKey,
      band_key,
      min_value: r.min_value ?? null,
      max_value: r.max_value ?? null,
      score_value: r.score_value ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb
      .from("metrics_class_kpi_rubric")
      .upsert(rows, { onConflict: "class_type,kpi_key,band_key" });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load defaults into rubric", detail: error.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
  }

  // Always return fresh snapshot
  const snap = await fetchSnapshot(sb, pcOrgId);
  return NextResponse.json(snap, { headers: NO_STORE_HEADERS });
}