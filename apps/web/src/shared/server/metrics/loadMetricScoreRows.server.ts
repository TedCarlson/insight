// path: apps/web/src/shared/server/metrics/loadMetricScoreRows.server.ts

import { supabaseServer } from "@/shared/data/supabase/server";

export type MetricScoreRow = {
  tech_id: string;
  profile_key: string;
  metric_key: string;
  metric_value: number | null;
  band_key: string | null;
  weighted_points: number | null;
  numerator: number | null;
  denominator: number | null;
  metric_date: string | null;
  metric_batch_id: string;
};

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function loadMetricScoreRows(args: {
  pc_org_id: string;
  profile_key: string;
  metric_batch_ids: string[];
}): Promise<MetricScoreRow[]> {
  if (!args.metric_batch_ids.length) return [];

  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("metric_scores_v")
    .select(
      `
        metric_batch_id,
        metric_date,
        tech_id,
        profile_key,
        metric_key,
        metric_value,
        band_key,
        weighted_points,
        numerator,
        denominator
      `
    )
    .eq("profile_key", args.profile_key)
    .in("metric_batch_id", args.metric_batch_ids);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as any[];

  return rows.map((row) => ({
    metric_batch_id: String(row.metric_batch_id),
    metric_date: toNullableString(row.metric_date),
    tech_id: String(row.tech_id ?? "").trim(),
    profile_key: String(row.profile_key ?? ""),
    metric_key: String(row.metric_key),
    metric_value: toNullableNumber(row.metric_value),
    band_key: toNullableString(row.band_key),
    weighted_points: toNullableNumber(row.weighted_points),
    numerator: toNullableNumber(row.numerator),
    denominator: toNullableNumber(row.denominator),
  }));
}