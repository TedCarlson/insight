import type {
  KpiDefinitionLike,
  RawMetricPayload,
} from "@/shared/kpis/contracts/kpiTypes";
import { normalizeKpiKey } from "@/shared/kpis/definitions/normalizeKpiKey";

function numOrNull(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function resolveByCandidateKeys(args: {
  raw: RawMetricPayload;
  candidates: string[];
}): number | null {
  for (const candidate of args.candidates) {
    const direct = numOrNull(args.raw[candidate]);
    if (direct !== null) return direct;
  }

  const normalizedCandidates = args.candidates.map(normalizeKpiKey);

  for (const [key, value] of Object.entries(args.raw)) {
    const normalizedKey = normalizeKpiKey(key);
    if (!normalizedCandidates.includes(normalizedKey)) continue;

    const n = numOrNull(value);
    if (n !== null) return n;
  }

  return null;
}

function getDefinitionCandidates(def: KpiDefinitionLike): string[] {
  return [
    def.raw_label_identifier,
    def.customer_label,
    def.label,
    def.kpi_key,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

/**
 * Single-row raw resolution only.
 * No aggregation logic belongs here.
 */
export function resolveRawValue(args: {
  def: KpiDefinitionLike;
  raw: RawMetricPayload;
}): number | null {
  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: getDefinitionCandidates(args.def),
  });
}