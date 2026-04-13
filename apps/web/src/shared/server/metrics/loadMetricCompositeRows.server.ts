// path: apps/web/src/shared/server/metrics/loadMetricCompositeRows.server.ts

import { supabaseServer } from "@/shared/data/supabase/server";

export type MetricCompositeRow = {
  tech_id: string;
  full_name: string | null;
  composite_score: number | null;
  rank_in_profile: number | null;
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

export async function loadMetricCompositeRows(args: {
  pc_org_id: string;
  profile_key: string;
  metric_batch_ids: string[];
}): Promise<MetricCompositeRow[]> {
  if (!args.metric_batch_ids.length) return [];

  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("metric_subject_composites_v")
    .select(
      `
        metric_batch_id,
        metric_date,
        tech_id,
        full_name,
        composite_score,
        rank_in_profile
      `
    )
    .eq("profile_key", args.profile_key)
    .in("metric_batch_id", args.metric_batch_ids)
    .order("metric_date", { ascending: false })
    .order("rank_in_profile", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as any[];

  return rows.map((row) => ({
    metric_batch_id: String(row.metric_batch_id),
    metric_date: toNullableString(row.metric_date),
    tech_id: String(row.tech_id ?? "").trim(),
    full_name: toNullableString(row.full_name),
    composite_score: toNullableNumber(row.composite_score),
    rank_in_profile: toNullableNumber(row.rank_in_profile),
  }));
}