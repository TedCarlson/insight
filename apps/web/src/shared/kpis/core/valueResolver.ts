import type { ResolvedKpiDefinition } from "@/shared/kpis/core/definitionResolver";

function numOrNull(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_%]/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

function computeTnpsScore(
  surveys: number,
  promoters: number,
  detractors: number
): number | null {
  if (surveys <= 0) return null;
  return (100 * (promoters - detractors)) / surveys;
}

function computeRatioScore(
  numerator: number,
  denominator: number
): number | null {
  if (denominator <= 0) return null;
  return (100 * numerator) / denominator;
}

function resolveByCandidateKeys(args: {
  raw: Record<string, unknown>;
  candidates: string[];
}): number | null {
  for (const candidate of args.candidates) {
    const direct = numOrNull(args.raw[candidate]);
    if (direct !== null) return direct;
  }

  const normalizedCandidates = args.candidates.map(normalizeToken);

  for (const [key, value] of Object.entries(args.raw)) {
    const normalizedKey = normalizeToken(key);
    if (normalizedCandidates.includes(normalizedKey)) {
      const n = numOrNull(value);
      if (n !== null) return n;
    }
  }

  return null;
}

function getDefinitionCandidates(def: ResolvedKpiDefinition): string[] {
  return uniqueStrings([
    def.raw_label_identifier,
    def.customer_label,
    def.label,
    def.kpi_key,
  ]);
}

function getTnpsComponent(args: {
  raw: Record<string, unknown>;
  kind: "surveys" | "promoters" | "detractors";
}): number | null {
  if (args.kind === "surveys") {
    return resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "tNPS Surveys",
        "tnps_surveys",
        "tNPS_Surveys",
        "Surveys",
      ],
    });
  }

  if (args.kind === "promoters") {
    return resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "Promoters",
        "tnps_promoters",
      ],
    });
  }

  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: [
      "Detractors",
      "tnps_detractors",
    ],
  });
}

function resolveTnpsFromRaw(raw: Record<string, unknown>): number | null {
  const surveys = getTnpsComponent({ raw, kind: "surveys" }) ?? 0;
  const promoters = getTnpsComponent({ raw, kind: "promoters" }) ?? 0;
  const detractors = getTnpsComponent({ raw, kind: "detractors" }) ?? 0;

  if (surveys > 0) {
    return computeTnpsScore(surveys, promoters, detractors);
  }

  return resolveByCandidateKeys({
    raw,
    candidates: ["tNPS Rate", "tnps", "tnps_score", "tNPS"],
  });
}

function normalizeKpiKey(kpiKey: string) {
  return normalizeToken(kpiKey);
}

function isTnpsKpi(def: ResolvedKpiDefinition) {
  const key = normalizeKpiKey(def.kpi_key);
  return key === "tnps" || key === "tnpsscore";
}

function isFtrKpi(def: ResolvedKpiDefinition) {
  const key = normalizeKpiKey(def.kpi_key);
  const candidates = getDefinitionCandidates(def).map(normalizeToken);

  return (
    key === "ftr" ||
    key === "ftrrate" ||
    candidates.some((candidate) =>
      candidate.includes("ftr") ||
      candidate.includes("firsttrip") ||
      candidate.includes("firsttimeright")
    )
  );
}

function isToolUsageKpi(def: ResolvedKpiDefinition) {
  const key = normalizeKpiKey(def.kpi_key);
  const candidates = getDefinitionCandidates(def).map(normalizeToken);

  return (
    key === "toolusage" ||
    key === "toolusagerate" ||
    candidates.some((candidate) =>
      candidate.includes("toolusage") ||
      candidate.includes("toolused") ||
      candidate.includes("tool")
    )
  );
}

function getFtrComponent(args: {
  raw: Record<string, unknown>;
  kind: "numerator" | "denominator";
}): number | null {
  if (args.kind === "numerator") {
    return resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "ftr_numerator",
        "ftr completed",
        "ftr_completed",
        "jobs completed first trip",
        "first trip completed",
        "first_trip_completed",
        "first time right hits",
        "first_time_right_hits",
      ],
    });
  }

  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: [
      "ftr_denominator",
      "ftr eligible",
      "ftr_eligible",
      "eligible jobs",
      "eligible_jobs",
      "completed jobs",
      "completed_jobs",
      "jobs completed",
      "jobs_completed",
      "total jobs",
      "total_jobs",
    ],
  });
}

function getToolUsageComponent(args: {
  raw: Record<string, unknown>;
  kind: "numerator" | "denominator";
}): number | null {
  if (args.kind === "numerator") {
    return resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "tool_usage_numerator",
        "tool used jobs",
        "tool_used_jobs",
        "jobs with tool usage",
        "jobs_with_tool_usage",
        "tool usage hits",
        "tool_usage_hits",
        "tool compliant jobs",
        "tool_compliant_jobs",
      ],
    });
  }

  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: [
      "tool_usage_denominator",
      "tool usage eligible",
      "tool_usage_eligible",
      "eligible jobs",
      "eligible_jobs",
      "completed jobs",
      "completed_jobs",
      "jobs completed",
      "jobs_completed",
      "total jobs",
      "total_jobs",
    ],
  });
}

function resolveRatioFromRaw(args: {
  raw: Record<string, unknown>;
  numeratorCandidates: string[];
  denominatorCandidates: string[];
  valueCandidates: string[];
}): number | null {
  const numerator = resolveByCandidateKeys({
    raw: args.raw,
    candidates: args.numeratorCandidates,
  }) ?? 0;

  const denominator = resolveByCandidateKeys({
    raw: args.raw,
    candidates: args.denominatorCandidates,
  }) ?? 0;

  if (denominator > 0) {
    return computeRatioScore(numerator, denominator);
  }

  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: args.valueCandidates,
  });
}

function resolveFtrFromRaw(raw: Record<string, unknown>): number | null {
  return resolveRatioFromRaw({
    raw,
    numeratorCandidates: [
      "ftr_numerator",
      "ftr completed",
      "ftr_completed",
      "jobs completed first trip",
      "first trip completed",
      "first_trip_completed",
      "first time right hits",
      "first_time_right_hits",
    ],
    denominatorCandidates: [
      "ftr_denominator",
      "ftr eligible",
      "ftr_eligible",
      "eligible jobs",
      "eligible_jobs",
      "completed jobs",
      "completed_jobs",
      "jobs completed",
      "jobs_completed",
      "total jobs",
      "total_jobs",
    ],
    valueCandidates: [
      "FTR%",
      "FTR",
      "ftr",
      "ftr_rate",
    ],
  });
}

function resolveToolUsageFromRaw(raw: Record<string, unknown>): number | null {
  return resolveRatioFromRaw({
    raw,
    numeratorCandidates: [
      "tool_usage_numerator",
      "tool used jobs",
      "tool_used_jobs",
      "jobs with tool usage",
      "jobs_with_tool_usage",
      "tool usage hits",
      "tool_usage_hits",
      "tool compliant jobs",
      "tool_compliant_jobs",
    ],
    denominatorCandidates: [
      "tool_usage_denominator",
      "tool usage eligible",
      "tool_usage_eligible",
      "eligible jobs",
      "eligible_jobs",
      "completed jobs",
      "completed_jobs",
      "jobs completed",
      "jobs_completed",
      "total jobs",
      "total_jobs",
    ],
    valueCandidates: [
      "Tool Usage",
      "ToolUsage",
      "tool_usage",
      "tool_usage_rate",
    ],
  });
}

function aggregateRatioComponents(args: {
  rows: Array<Record<string, unknown>>;
  numeratorGetter: (raw: Record<string, unknown>) => number | null;
  denominatorGetter: (raw: Record<string, unknown>) => number | null;
}): number | null {
  let numerator = 0;
  let denominator = 0;

  for (const raw of args.rows) {
    numerator += args.numeratorGetter(raw) ?? 0;
    denominator += args.denominatorGetter(raw) ?? 0;
  }

  return computeRatioScore(numerator, denominator);
}

function sumResolvedValues(args: {
  def: ResolvedKpiDefinition;
  rows: Array<Record<string, unknown>>;
}): number | null {
  let total = 0;
  let foundAny = false;

  for (const raw of args.rows) {
    const value = resolveRawValue({
      def: args.def,
      raw,
    });

    if (value == null || !Number.isFinite(value)) continue;
    total += value;
    foundAny = true;
  }

  return foundAny ? total : null;
}

export function resolveRawValue(args: {
  def: ResolvedKpiDefinition;
  raw: Record<string, unknown>;
}): number | null {
  if (isTnpsKpi(args.def)) {
    return resolveTnpsFromRaw(args.raw);
  }

  if (isFtrKpi(args.def)) {
    return resolveFtrFromRaw(args.raw);
  }

  if (isToolUsageKpi(args.def)) {
    return resolveToolUsageFromRaw(args.raw);
  }

  return resolveByCandidateKeys({
    raw: args.raw,
    candidates: getDefinitionCandidates(args.def),
  });
}

export function aggregateResolvedValues(args: {
  def: ResolvedKpiDefinition;
  rows: Array<Record<string, unknown>>;
}): number | null {
  if (isTnpsKpi(args.def)) {
    let surveys = 0;
    let promoters = 0;
    let detractors = 0;

    for (const raw of args.rows) {
      surveys += getTnpsComponent({ raw, kind: "surveys" }) ?? 0;
      promoters += getTnpsComponent({ raw, kind: "promoters" }) ?? 0;
      detractors += getTnpsComponent({ raw, kind: "detractors" }) ?? 0;
    }

    return computeTnpsScore(surveys, promoters, detractors);
  }

  if (isFtrKpi(args.def)) {
    return aggregateRatioComponents({
      rows: args.rows,
      numeratorGetter: (raw) => getFtrComponent({ raw, kind: "numerator" }),
      denominatorGetter: (raw) => getFtrComponent({ raw, kind: "denominator" }),
    });
  }

  if (isToolUsageKpi(args.def)) {
    return aggregateRatioComponents({
      rows: args.rows,
      numeratorGetter: (raw) => getToolUsageComponent({ raw, kind: "numerator" }),
      denominatorGetter: (raw) => getToolUsageComponent({ raw, kind: "denominator" }),
    });
  }

  return sumResolvedValues(args);
}