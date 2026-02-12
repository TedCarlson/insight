// apps/web/src/app/api/admin/metrics-config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { computeRubricDefaults } from "@/features/metrics-admin/lib/spillDefaults";

export const runtime = "nodejs";

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

/**
 * MSO is derived from PC Org for this surface.
 * We DO NOT accept/require mso_id from caller anymore.
 */
async function resolveMsoIdFromPcOrg(sb: any, pcOrgId: string): Promise<string | null> {
  const { data, error } = await sb
    .from("metrics_class_meta")
    .select("mso_id")
    .eq("pc_org_id", pcOrgId)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const mso = data?.mso_id ? String(data.mso_id) : null;
  return mso && mso.trim() ? mso : null;
}

async function fetchSnapshot(sb: any, pcOrgId: string, msoId: string) {
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
      .eq("mso_id", msoId)
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
      mso_id: msoId,
    },
  };
}

// -----------------------------------------------------
// GET
// -----------------------------------------------------
export async function GET(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = gate.sb;

  const pcOrgId = await resolvePcOrgIdFromSession(sb, gate.user.id);
  if (!pcOrgId) {
    return NextResponse.json(
      { error: "No PC Org selected", detail: "Select a PC Org in your session to use Metrics Admin." },
      { status: 400 }
    );
  }

  const msoId = await resolveMsoIdFromPcOrg(sb, pcOrgId);
  if (!msoId) {
    return NextResponse.json(
      {
        error: "MSO not mapped for selected PC Org",
        detail: "metrics_class_meta must contain a row mapping pc_org_id -> mso_id for this org.",
        hint: { pc_org_id: pcOrgId },
      },
      { status: 400 }
    );
  }

  const snap = await fetchSnapshot(sb, pcOrgId, msoId);
  return NextResponse.json(snap);
}

// -----------------------------------------------------
// POST
// -----------------------------------------------------
export async function POST(req: NextRequest) {
  const gate = await ownerGate();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = gate.sb;
  const body = await req.json().catch(() => null);
  const op = body?.op;

  const pcOrgId = await resolvePcOrgIdFromSession(sb, gate.user.id);
  if (!pcOrgId) {
    return NextResponse.json(
      { error: "No PC Org selected", detail: "Select a PC Org in your session to use Metrics Admin." },
      { status: 400 }
    );
  }

  const msoId = await resolveMsoIdFromPcOrg(sb, pcOrgId);
  if (!msoId) {
    return NextResponse.json(
      {
        error: "MSO not mapped for selected PC Org",
        detail: "metrics_class_meta must contain a row mapping pc_org_id -> mso_id for this org.",
        hint: { pc_org_id: pcOrgId },
      },
      { status: 400 }
    );
  }

  // -----------------------------------------------------
  // SAVE GRID
  // -----------------------------------------------------
  if (op === "SAVE_GRID") {
    const payload = body?.payload;
    if (!payload) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

    // -------------------------------
    // KPI defs (metrics_kpi_def)
    // -------------------------------
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
        .filter((d: any) => d.kpi_key);

      if (incoming.length) {
        const keys = incoming.map((d: any) => d.kpi_key);

        const { data: existingRows, error: existingErr } = await sb
          .from("metrics_kpi_def")
          .select(
            "kpi_key,label,customer_label,direction,unit,min_value,max_value,is_active,raw_label_identifier,no_data_behavior"
          )
          .in("kpi_key", keys);

        if (existingErr) {
          return NextResponse.json({ error: "Failed to read existing KPI defs" }, { status: 500 });
        }

        const byKey = new Map<string, any>();
        for (const r of existingRows ?? []) byKey.set(String(r.kpi_key), r);

        const upsertRows: any[] = [];
        for (const d of incoming) {
          const prev = byKey.get(d.kpi_key);

          const label = d.label ?? prev?.label;
          const direction = d.direction ?? prev?.direction;
          const unit = d.unit ?? prev?.unit;

          // DB NOT NULL safety for new keys
          if (!label || !direction || !unit) {
            return NextResponse.json(
              {
                error: "KPI def missing required fields",
                detail: `kpi_key=${d.kpi_key} requires label, direction, and unit (DB NOT NULL).`,
              },
              { status: 400 }
            );
          }

          upsertRows.push({
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
          });
        }

        const { error: upErr } = await sb.from("metrics_kpi_def").upsert(upsertRows, { onConflict: "kpi_key" });

        if (upErr) {
          return NextResponse.json({ error: "Failed to upsert KPI defs", detail: upErr.message }, { status: 500 });
        }
      }
    }

    // -------------------------------
    // Class config (metrics_class_kpi_config)
    // Map UI -> DB:
    // - weight_percent -> weight
    // - threshold -> threshold_value
    // - grade_value -> grade_value
    // -------------------------------
    if (Array.isArray(payload.classConfig) && payload.classConfig.length) {
      const rows = payload.classConfig
        .map((c: any) => {
          const class_type = upper(c?.class_type);
          const kpi_key = str(c?.kpi_key);
          if (!class_type || !kpi_key) return null;

          const enabled = !!c?.enabled;

          // weight is NOT NULL in DB; default to 0
          const weight = numOrNull(c?.weight_percent ?? c?.weight);
          const threshold_value = numOrNull(c?.threshold ?? c?.threshold_value);

          // decimals supported
          const grade_value = numOrNull(c?.grade_value);

          return {
            class_type,
            kpi_key,
            enabled,
            weight: weight ?? 0,
            threshold_value,
            grade_value,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (rows.length) {
        const { error: cfgErr } = await sb
          .from("metrics_class_kpi_config")
          .upsert(rows, { onConflict: "class_type,kpi_key" });

        if (cfgErr) {
          return NextResponse.json(
            {
              error: "Failed to upsert class config",
              detail: cfgErr.message,
              hint: "Verify metrics_class_kpi_config has columns weight, threshold_value, grade_value.",
            },
            { status: 500 }
          );
        }
      }
    }

    // -------------------------------
    // Rubric (metrics_class_kpi_rubric) — derived MSO scoped
    // DB PK: (mso_id, class_type, kpi_key, band_key)
    // Includes optional color_hex (persist formatting by band row)
    // -------------------------------
    if (Array.isArray(payload.rubricRows) && payload.rubricRows.length) {
      const rows = payload.rubricRows
        .map((r: any) => {
          const class_type = upper(r?.class_type);
          const kpi_key = str(r?.kpi_key);
          const band_key = str(r?.band_key);
          if (!class_type || !kpi_key || !band_key) return null;

          const color_hex = r?.color_hex == null ? null : str(r?.color_hex) || null;

          return {
            mso_id: msoId,
            class_type,
            kpi_key,
            band_key,
            min_value: numOrNull(r?.min_value),
            max_value: numOrNull(r?.max_value),
            score_value: numOrNull(r?.score_value),
            color_hex,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (rows.length) {
        const { error: rubErr } = await sb
          .from("metrics_class_kpi_rubric")
          .upsert(rows, { onConflict: "mso_id,class_type,kpi_key,band_key" });

        if (rubErr) {
          return NextResponse.json({ error: "Failed to upsert rubric rows", detail: rubErr.message }, { status: 500 });
        }
      }
    }
  }

  // -----------------------------------------------------
  // LOAD DEFAULTS (derived MSO scoped rubric upsert)
  // -----------------------------------------------------
  if (op === "LOAD_DEFAULTS") {
    const p = body?.payload;

    if (!p?.classType || !p?.kpiKey || !p?.kpiDef || !p?.classConfig) {
      return NextResponse.json({ error: "Missing load-defaults payload" }, { status: 400 });
    }

    const classType = upper(p.classType);
    const kpiKey = str(p.kpiKey);

    const threshold = numOrNull(p.classConfig.threshold ?? p.classConfig.threshold_value);
    const grade_value = numOrNull(p.classConfig.grade_value);

    if (threshold === null) {
      return NextResponse.json(
        { error: "Missing threshold for load-defaults", detail: "threshold/threshold_value is required" },
        { status: 400 }
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

    const upRows = Object.entries(computed).map(([band_key, r]: any) => ({
      mso_id: msoId,
      class_type: classType,
      kpi_key: kpiKey,
      band_key,
      min_value: r.min_value ?? null,
      max_value: r.max_value ?? null,
      score_value: r.score_value ?? null,
      // do not clobber existing colors when loading defaults
      updated_at: new Date().toISOString(),
    }));

    const { error: rubErr } = await sb
      .from("metrics_class_kpi_rubric")
      .upsert(upRows, { onConflict: "mso_id,class_type,kpi_key,band_key" });

    if (rubErr) {
      return NextResponse.json({ error: "Failed to load defaults into rubric", detail: rubErr.message }, { status: 500 });
    }
  }

  // Always return fresh snapshot (derived MSO scoped rubric)
  const snap = await fetchSnapshot(sb, pcOrgId, msoId);
  return NextResponse.json(snap);
}