import { supabaseServer } from "@/shared/data/supabase/server";

export type MetricWorkMixRow = {
  tech_id: string;
  metric_batch_id: string;
  metric_date: string | null;
  installs: number;
  tcs: number;
  sros: number;
  total: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

export async function loadMetricWorkMixRows(args: {
  pc_org_id: string;
  metric_batch_ids: string[];
}): Promise<MetricWorkMixRow[]> {
  if (!args.metric_batch_ids.length) return [];

  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("metric_payload_flat_v")
    .select(
      `
        metric_batch_id,
        metric_date,
        tech_id,
        installs,
        tcs,
        sros
      `
    )
    .eq("pc_org_id", args.pc_org_id)
    .in("metric_batch_id", args.metric_batch_ids);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as any[];

  return rows.map((row) => {
    const installs = toNumber(row.installs);
    const tcs = toNumber(row.tcs);
    const sros = toNumber(row.sros);

    return {
      tech_id: String(row.tech_id ?? "").trim(),
      metric_batch_id: String(row.metric_batch_id ?? "").trim(),
      metric_date: toNullableString(row.metric_date),
      installs,
      tcs,
      sros,
      total: installs + tcs + sros,
    };
  });
}