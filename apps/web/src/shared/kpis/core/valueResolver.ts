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

function averageValues(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function normalizeKpiKey(kpiKey: string) {
  return normalizeToken(kpiKey);
}

function isTnpsKpi(def: ResolvedKpiDefinition) {
  const key = normalizeKpiKey(def.kpi_key);
  return key === "tnps" || key === "tnpsscore";
}

export function resolveRawValue(args: {
  def: ResolvedKpiDefinition;
  raw: Record<string, unknown>;
}): number | null {
  if (isTnpsKpi(args.def)) {
    return resolveTnpsFromRaw(args.raw);
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

  const values = args.rows.map((raw) =>
    resolveRawValue({
      def: args.def,
      raw,
    })
  );

  return averageValues(values);
}