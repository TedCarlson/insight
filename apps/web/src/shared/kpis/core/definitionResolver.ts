import { loadKpiConfigBundle, type KpiClassConfig, type KpiDefinition } from "@/shared/kpis/core/configLoader.server";
import type { KpiRubricRow } from "@/shared/kpis/core/types";

export type ResolvedKpiDefinition = {
  kpi_key: string;
  label: string;
  customer_label: string | null;
  raw_label_identifier: string | null;
  direction: string | null;
  unit: string | null;

  enabled: boolean;
  weight: number | null;

  report_order: number | null;
  display_order: number | null;
  sort_order: number | null;
  ui_order: number | null;

  rubric: KpiRubricRow[];
};

export type ResolvedKpiConfig = {
  activePresetKey: string | null;
  allKpis: Map<string, ResolvedKpiDefinition>;
  byClassType: Map<string, ResolvedKpiDefinition[]>;
};

function pickBestLabel(def: KpiDefinition | undefined, kpiKey: string): string {
  return (
    def?.customer_label?.trim() ||
    def?.label?.trim() ||
    kpiKey
  );
}

function normalizeClassType(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function buildResolvedDefinition(args: {
  kpiKey: string;
  def?: KpiDefinition;
  classCfg?: KpiClassConfig;
  rubric?: KpiRubricRow[];
}): ResolvedKpiDefinition {
  const { kpiKey, def, classCfg, rubric } = args;

  return {
    kpi_key: kpiKey,
    label: pickBestLabel(def, kpiKey),
    customer_label: def?.customer_label ?? null,
    raw_label_identifier: def?.raw_label_identifier ?? null,
    direction: def?.direction ?? null,
    unit: def?.unit ?? null,

    enabled: classCfg?.enabled ?? true,
    weight: classCfg?.weight ?? null,

    report_order: classCfg?.report_order ?? null,
    display_order: classCfg?.display_order ?? null,
    sort_order: classCfg?.sort_order ?? null,
    ui_order: classCfg?.ui_order ?? null,

    rubric: rubric ?? [],
  };
}

function sortResolvedDefinitions(
  a: ResolvedKpiDefinition,
  b: ResolvedKpiDefinition
) {
  const aOrder =
    a.report_order ??
    a.display_order ??
    a.sort_order ??
    a.ui_order ??
    Number.MAX_SAFE_INTEGER;

  const bOrder =
    b.report_order ??
    b.display_order ??
    b.sort_order ??
    b.ui_order ??
    Number.MAX_SAFE_INTEGER;

  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.label.localeCompare(b.label);
}

export async function loadResolvedKpiConfig(): Promise<ResolvedKpiConfig> {
  const bundle = await loadKpiConfigBundle();

  const allKeys = new Set<string>();

  for (const key of bundle.kpiDefs.keys()) {
    allKeys.add(key);
  }

  for (const row of bundle.classConfig) {
    if (row.kpi_key) allKeys.add(row.kpi_key);
  }

  for (const key of bundle.rubricByKpi.keys()) {
    allKeys.add(key);
  }

  const allKpis = new Map<string, ResolvedKpiDefinition>();

  for (const kpiKey of allKeys) {
    const def = bundle.kpiDefs.get(kpiKey);
    const classCfg = bundle.classConfig.find(
      (row) => row.kpi_key === kpiKey
    );
    const rubric = bundle.rubricByKpi.get(kpiKey) ?? [];

    allKpis.set(
      kpiKey,
      buildResolvedDefinition({
        kpiKey,
        def,
        classCfg,
        rubric,
      })
    );
  }

  const byClassType = new Map<string, ResolvedKpiDefinition[]>();

  const classTypes = Array.from(
    new Set(bundle.classConfig.map((row) => normalizeClassType(row.class_type)))
  ).filter(Boolean);

  for (const classType of classTypes) {
    const rows = bundle.classConfig.filter(
      (row) => normalizeClassType(row.class_type) === classType
    );

    const resolved = rows
      .map((row) =>
        buildResolvedDefinition({
          kpiKey: row.kpi_key,
          def: bundle.kpiDefs.get(row.kpi_key),
          classCfg: row,
          rubric: bundle.rubricByKpi.get(row.kpi_key) ?? [],
        })
      )
      .filter((row) => row.enabled)
      .sort(sortResolvedDefinitions);

    byClassType.set(classType, resolved);
  }

  return {
    activePresetKey: bundle.activePresetKey,
    allKpis,
    byClassType,
  };
}

export function getResolvedKpiForClass(args: {
  config: ResolvedKpiConfig;
  classType: string;
  kpiKey: string;
}): ResolvedKpiDefinition | null {
  const classType = normalizeClassType(args.classType);
  const rows = args.config.byClassType.get(classType) ?? [];
  return rows.find((row) => row.kpi_key === args.kpiKey) ?? null;
}

export function getResolvedKpisForClass(args: {
  config: ResolvedKpiConfig;
  classType: string;
}): ResolvedKpiDefinition[] {
  const classType = normalizeClassType(args.classType);
  return args.config.byClassType.get(classType) ?? [];
}

export function getResolvedKpi(args: {
  config: ResolvedKpiConfig;
  kpiKey: string;
}): ResolvedKpiDefinition | null {
  return args.config.allKpis.get(args.kpiKey) ?? null;
}