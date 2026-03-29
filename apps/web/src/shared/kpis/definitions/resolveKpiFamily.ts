import type {
  KpiDefinitionLike,
  KpiFamily,
} from "@/shared/kpis/contracts/kpiTypes";
import { normalizeKpiKey } from "./normalizeKpiKey";

function collectCandidates(def: KpiDefinitionLike): string[] {
  return [
    def.kpi_key,
    def.label ?? "",
    def.customer_label ?? "",
    def.raw_label_identifier ?? "",
  ]
    .map(normalizeKpiKey)
    .filter(Boolean);
}

export function resolveKpiFamily(def: KpiDefinitionLike): KpiFamily {
  const key = normalizeKpiKey(def.kpi_key);
  const candidates = collectCandidates(def);

  // tNPS (explicit)
  if (key === "tnps" || key === "tnpsscore") {
    return "tnps";
  }

  // Ratio KPIs (FTR, Tool Usage, Rates, % metrics)
  if (
    key.includes("rate") ||
    key.includes("percent") ||
    key.includes("pct") ||
    key.includes("usage") ||
    key.includes("ftr") ||
    candidates.some((c) => c.includes("rate")) ||
    candidates.some((c) => c.includes("percent")) ||
    candidates.some((c) => c.includes("pct")) ||
    candidates.some((c) => c.includes("ftr")) ||
    candidates.some((c) => c.includes("usage"))
  ) {
    return "ratio";
  }

  // Sum KPIs (counts, totals)
  if (
    candidates.some((c) => c.includes("count")) ||
    candidates.some((c) => c.includes("jobs")) ||
    candidates.some((c) => c.includes("surveys")) ||
    candidates.some((c) => c.includes("promoters")) ||
    candidates.some((c) => c.includes("detractors")) ||
    candidates.some((c) => c.includes("installs")) ||
    candidates.some((c) => c.includes("tcs")) ||
    candidates.some((c) => c.includes("sros"))
  ) {
    return "sum";
  }

  // Fallback → direct value
  if (key) {
    return "direct_value";
  }

  return "unknown";
}