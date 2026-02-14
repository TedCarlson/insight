import { pickBand } from "@/features/metrics-reports/lib/score";
import type { RubricRow } from "@/features/metrics-reports/lib/score";

export function resolveRubricKey(allKeys: string[], hints: string[]) {
  const keys = (allKeys ?? []).map((k) => String(k));
  for (const h of hints) {
    const needle = h.toLowerCase();
    const hit = keys.find((k) => k.toLowerCase().includes(needle));
    if (hit) return hit;
  }
  return null;
}

export function buildRubricMap(rows: RubricRow[]) {
  const map = new Map<string, RubricRow[]>();
  for (const r of rows) {
    const k = String(r.kpi_key);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return map;
}

export function applyBandsToRows(
  rows: any[],
  rubricMap: Map<string, RubricRow[]>,
  keys: {
    tnpsKey: string | null;
    ftrKey: string | null;
    toolKey: string | null;
  }
) {
  return rows.map((r) => {
    const tnps = Number.isFinite(Number(r.tnps_score))
      ? Number(r.tnps_score)
      : null;

    const ftr = Number.isFinite(Number(r.ftr_rate))
      ? Number(r.ftr_rate)
      : null;

    const tool = Number.isFinite(Number(r.tool_usage_rate))
      ? Number(r.tool_usage_rate)
      : null;

    return {
      ...r,
      __tnps_band_key: pickBand({
        metricValue: tnps,
        rubricRows: keys.tnpsKey ? rubricMap.get(keys.tnpsKey) ?? [] : [],
      }),
      __ftr_band_key: pickBand({
        metricValue: ftr,
        rubricRows: keys.ftrKey ? rubricMap.get(keys.ftrKey) ?? [] : [],
      }),
      __tool_band_key: pickBand({
        metricValue: tool,
        rubricRows: keys.toolKey ? rubricMap.get(keys.toolKey) ?? [] : [],
      }),
    };
  });
}