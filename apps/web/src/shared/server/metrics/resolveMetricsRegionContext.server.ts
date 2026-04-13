// path: apps/web/src/shared/server/metrics/resolveMetricsRegionContext.server.ts

import { supabaseServer } from "@/shared/data/supabase/server";

export type MetricsRegionContext = {
  region_id: string | null;
  region_name: string | null;
  region_code: string | null;
  org_display: string | null;
  comparison_scope_code: string;
};

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function resolveMetricsRegionContext(args: {
  pc_org_id: string;
}): Promise<MetricsRegionContext> {
  const sb = await supabaseServer();

  const { data: pcOrgRow, error: pcOrgError } = await sb
    .from("pc_org")
    .select("region_id")
    .eq("pc_org_id", args.pc_org_id)
    .maybeSingle();

  if (pcOrgError) {
    throw new Error(pcOrgError.message);
  }

  const regionId = toNullableString((pcOrgRow as any)?.region_id);

  if (!regionId) {
    return {
      region_id: null,
      region_name: null,
      region_code: null,
      org_display: null,
      comparison_scope_code: "ORG",
    };
  }

  const { data: regionRow, error: regionError } = await sb
    .from("region")
    .select("region_name, region_code")
    .eq("region_id", regionId)
    .maybeSingle();

  if (regionError) {
    throw new Error(regionError.message);
  }

  const regionName = toNullableString((regionRow as any)?.region_name);
  const regionCode = toNullableString((regionRow as any)?.region_code);

  return {
    region_id: regionId,
    region_name: regionName,
    region_code: regionCode,
    org_display: regionName
      ? `${regionName}${regionCode ? ` (${regionCode})` : ""}`
      : null,
    comparison_scope_code: regionCode ?? "ORG",
  };
}