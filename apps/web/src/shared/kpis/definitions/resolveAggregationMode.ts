import type {
  KpiAggregationMode,
  KpiDefinitionLike,
  KpiSourcePolicy,
} from "@/shared/kpis/contracts/kpiTypes";
import { resolveKpiFamily } from "./resolveKpiFamily";

export function resolveAggregationMode(args: {
  def: KpiDefinitionLike;
  source_policy?: KpiSourcePolicy;
}): KpiAggregationMode {
  const family = resolveKpiFamily(args.def);
  const sourcePolicy = args.source_policy ?? "prefer_atomic";

  if (sourcePolicy === "totals_only") {
    return "direct_total_row";
  }

  if (sourcePolicy === "prefer_totals") {
    return "direct_total_row";
  }

  if (family === "tnps") {
    return "aggregate_tnps";
  }

  if (family === "ratio") {
    return "aggregate_ratio";
  }

  if (family === "sum") {
    return "aggregate_sum";
  }

  if (family === "direct_value") {
    return sourcePolicy === "atomic_only"
      ? "direct_atomic_row"
      : "direct_total_row";
  }

  return "unknown";
}