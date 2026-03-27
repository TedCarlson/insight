import { supabaseAdmin } from "@/shared/data/supabase/admin";
import type { KpiBandKey, KpiRubricRow } from "@/shared/kpis/core/types";

// ---------- TYPES ----------

export type KpiDefinition = {
  kpi_key: string;
  label: string | null;
  customer_label: string | null;
  raw_label_identifier: string | null;
  direction: string | null;
  unit: string | null;
};

export type KpiClassConfig = {
  class_type: string;
  kpi_key: string;
  enabled: boolean;
  weight: number | null;
  report_order: number | null;
  display_order: number | null;
  sort_order: number | null;
  ui_order: number | null;
};

export type KpiConfigBundle = {
  kpiDefs: Map<string, KpiDefinition>;
  classConfig: KpiClassConfig[];
  rubricByKpi: Map<string, KpiRubricRow[]>;
  activePresetKey: string | null;
};

// ---------- LOAD ----------

export async function loadKpiConfigBundle(): Promise<KpiConfigBundle> {
  const sb = supabaseAdmin();

  // parallel pulls
  const [
    { data: kpiDefsRaw },
    { data: classConfigRaw },
    { data: rubricRaw },
    { data: presetRow },
  ] = await Promise.all([
    sb.from("metrics_kpi_def").select("*"),
    sb.from("metrics_class_kpi_config").select("*"),
    sb
      .from("metrics_kpi_rubric")
      .select("*")
      .or("is_active.is.null,is_active.eq.true"),
    sb
      .from("metrics_color_preset")
      .select("preset_key")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  // ---------- KPI DEFINITIONS ----------

  const kpiDefs = new Map<string, KpiDefinition>();

  for (const row of (kpiDefsRaw ?? []) as any[]) {
    const key = String(row.kpi_key ?? "").trim();
    if (!key) continue;

    kpiDefs.set(key, {
      kpi_key: key,
      label: row.label ?? null,
      customer_label: row.customer_label ?? null,
      raw_label_identifier: row.raw_label_identifier ?? null,
      direction: row.direction ?? null,
      unit: row.unit ?? null,
    });
  }

  // ---------- CLASS CONFIG ----------

  const classConfig: KpiClassConfig[] = (classConfigRaw ?? []).map((row: any) => ({
    class_type: String(row.class_type ?? ""),
    kpi_key: String(row.kpi_key ?? ""),
    enabled: !!row.enabled,
    weight: row.weight ?? null,
    report_order: row.report_order ?? null,
    display_order: row.display_order ?? null,
    sort_order: row.sort_order ?? null,
    ui_order: row.ui_order ?? null,
  }));

  // ---------- RUBRIC ----------

  const rubricByKpi = new Map<string, KpiRubricRow[]>();

  for (const row of (rubricRaw ?? []) as any[]) {
    const key = String(row.kpi_key ?? "").trim();
    if (!key) continue;

    const entry: KpiRubricRow = {
      kpi_key: key,
      band_key: row.band_key as KpiBandKey,
      min_value: row.min_value ?? null,
      max_value: row.max_value ?? null,
      score_value: row.score_value ?? null,
    };

    const arr = rubricByKpi.get(key) ?? [];
    arr.push(entry);
    rubricByKpi.set(key, arr);
  }

  // ---------- PRESET ----------

  const activePresetKey = presetRow?.preset_key ?? null;

  // ---------- RETURN ----------

  return {
    kpiDefs,
    classConfig,
    rubricByKpi,
    activePresetKey,
  };
}