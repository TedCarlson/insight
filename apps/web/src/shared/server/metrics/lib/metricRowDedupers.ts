// path: apps/web/src/shared/server/metrics/lib/metricRowDedupers.ts

import { loadMetricCompositeRows } from "@/shared/server/metrics/loadMetricCompositeRows.server";
import { loadMetricScoreRows } from "@/shared/server/metrics/loadMetricScoreRows.server";
import { loadMetricWorkMixRows } from "@/shared/server/metrics/loadMetricWorkMixRows.server";

function metricDateSortValue(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : 0;
}

export function dedupeLatestCompositeRows(
  rows: Awaited<ReturnType<typeof loadMetricCompositeRows>>
): Awaited<ReturnType<typeof loadMetricCompositeRows>> {
  const sorted = [...rows].sort((a, b) => {
    const dateDiff =
      metricDateSortValue(b.metric_date) - metricDateSortValue(a.metric_date);
    if (dateDiff !== 0) return dateDiff;
    return a.tech_id.localeCompare(b.tech_id);
  });

  const seen = new Set<string>();
  const out: typeof rows = [];

  for (const row of sorted) {
    const techId = String(row.tech_id ?? "").trim();
    if (!techId || seen.has(techId)) continue;
    seen.add(techId);
    out.push(row);
  }

  return out.sort((a, b) => {
    const rankA =
      typeof a.rank_in_profile === "number" ? a.rank_in_profile : 999999;
    const rankB =
      typeof b.rank_in_profile === "number" ? b.rank_in_profile : 999999;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""));
  });
}

export function dedupeLatestScoreRows(
  rows: Awaited<ReturnType<typeof loadMetricScoreRows>>
): Awaited<ReturnType<typeof loadMetricScoreRows>> {
  const sorted = [...rows].sort((a, b) => {
    const dateDiff =
      metricDateSortValue(b.metric_date) - metricDateSortValue(a.metric_date);
    if (dateDiff !== 0) return dateDiff;

    const techDiff = a.tech_id.localeCompare(b.tech_id);
    if (techDiff !== 0) return techDiff;

    return a.metric_key.localeCompare(b.metric_key);
  });

  const seen = new Set<string>();
  const out: typeof rows = [];

  for (const row of sorted) {
    const key = `${row.tech_id}::${row.metric_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

export function dedupeLatestWorkMixRows(
  rows: Awaited<ReturnType<typeof loadMetricWorkMixRows>>
): Awaited<ReturnType<typeof loadMetricWorkMixRows>> {
  const sorted = [...rows].sort((a, b) => {
    const dateDiff =
      metricDateSortValue(b.metric_date) - metricDateSortValue(a.metric_date);
    if (dateDiff !== 0) return dateDiff;
    return a.tech_id.localeCompare(b.tech_id);
  });

  const seen = new Set<string>();
  const out: typeof rows = [];

  for (const row of sorted) {
    const techId = String(row.tech_id ?? "").trim();
    if (!techId || seen.has(techId)) continue;
    seen.add(techId);
    out.push(row);
  }

  return out;
}