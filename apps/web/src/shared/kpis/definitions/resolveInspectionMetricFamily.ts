import type { WorkforceInspectionMetricFamily } from "@/shared/kpis/contracts/inspectionTypes";

function normalizeKpiKey(kpiKey: string | null | undefined): string {
  return String(kpiKey ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function resolveInspectionMetricFamily(
  kpiKey: string | null | undefined
): WorkforceInspectionMetricFamily {
  const key = normalizeKpiKey(kpiKey);

  if (!key) return "unknown";

  if (key.includes("tnps")) {
    return "tnps";
  }

  if (
    key.includes("tool_usage") ||
    key.includes("toolusage") ||
    key.includes("tu_rate")
  ) {
    return "tool_usage";
  }

  if (
    key.includes("pure_pass") ||
    key.includes("purepass") ||
    key.includes("pht_pure_pass")
  ) {
    return "pure_pass";
  }

  if (
    key.includes("48hr") ||
    key.includes("48_hr") ||
    key.includes("callback")
  ) {
    return "contact_48hr";
  }

  if (key.includes("repeat")) {
    return "repeat";
  }

  if (key.includes("rework")) {
    return "rework";
  }

  if (key.includes("soi")) {
    return "soi";
  }

  if (key === "met" || key === "met_rate" || key.includes("metrate")) {
    return "met_rate";
  }

  if (key === "ftr" || key === "ftr_rate" || key.includes("ftr")) {
    return "ftr";
  }

  return "unknown";
}