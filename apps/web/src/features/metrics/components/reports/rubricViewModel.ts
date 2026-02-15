// apps/web/src/features/metrics/components/reports/rubricViewModel.ts

export type RubricRowLike = {
  kpi_key: string;
  band_key: string;
  min_value: number | null;
  max_value: number | null;
  score_value: number | null;
  [k: string]: any;
};

export function isRubricRowMeaningful(r: RubricRowLike): boolean {
  // “Meaningful” = at least one of min/max/score is present.
  return r.min_value != null || r.max_value != null || r.score_value != null;
}

/**
 * Filter out KPI groups where ALL rows are empty (min/max/score null).
 * Preserves original ordering within each group.
 */
export function filterRubricGroups<T extends RubricRowLike>(rows: T[]): T[] {
  const byKpi = new Map<string, T[]>();
  for (const r of rows) {
    const k = String(r.kpi_key ?? "");
    const arr = byKpi.get(k) ?? [];
    arr.push(r);
    byKpi.set(k, arr);
  }

  const filtered: T[] = [];
  for (const [, group] of byKpi.entries()) {
    const keepGroup = group.some(isRubricRowMeaningful);
    if (!keepGroup) continue;
    filtered.push(...group);
  }

  return filtered;
}