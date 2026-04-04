import type {
  WorkforceMetricCell,
  WorkforceRubricRow,
} from "@/shared/kpis/engine/workforceTypes";
import type { RankInputRow } from "@/shared/kpis/contracts/rankTypes";
import type {
  KpiDefinitionLike,
  RawMetricPayload,
} from "@/shared/kpis/contracts/kpiTypes";
import { resolveRankContextByTech } from "@/shared/kpis/engine/resolveRankContextByTech";
import { aggregateMetricFactsForKpi } from "@/shared/kpis/engine/aggregateMetricFactsForKpi";

export type ParityGroupType = "COMPANY" | "CONTRACTOR";

export type ParityRow = {
  label: string;
  group_type: ParityGroupType;
  metrics: WorkforceMetricCell[];
  hc: number;
  rank_value: number | null;
  rank_display: string | null;
};

type KpiDefinition = {
  kpi_key: string;
  label: string;
  sort_order?: number | null;
  weight?: number | null;
  direction?: string | null;
};

type RosterRowLike = {
  tech_id?: string | null;
  full_name?: string | null;
  composite_score?: number | null;
  composite_display?: string | null;
  team_class?: string | null;
  contractor_name?: string | null;
  metrics: WorkforceMetricCell[];
};

type ParityMode = "summary" | "detail";

type Params = {
  definitions: KpiDefinition[];
  roster_rows: RosterRowLike[];
  rubricByKpi?: Map<string, WorkforceRubricRow[]>;
  metricFactsByTech?: Map<string, unknown[]>;
  rank_population?: RankInputRow[];
  mode?: ParityMode;
};

type GroupBucket = {
  label: string;
  group_type: ParityGroupType;
  rows: RosterRowLike[];
  facts: RawMetricPayload[];
};

type RankedMetricEntry = {
  row: ParityRow;
  cell: WorkforceMetricCell;
  definition: KpiDefinition;
};

function toMaybeString(value: unknown) {
  const out = String(value ?? "").trim();
  return out || null;
}

function resolveGroupType(row: RosterRowLike): ParityGroupType {
  const contractor = toMaybeString(row.contractor_name);
  const teamClass = String(row.team_class ?? "").trim().toUpperCase();

  if (teamClass === "BP" || contractor) {
    return "CONTRACTOR";
  }

  return "COMPANY";
}

function normalizeSummaryGroupLabel(row: RosterRowLike) {
  const group_type = resolveGroupType(row);

  if (group_type === "CONTRACTOR") {
    return {
      label: "Contractor",
      group_type,
    };
  }

  return {
    label: "In-House",
    group_type,
  };
}

function resolveDetailLabel(row: RosterRowLike) {
  const fullName = toMaybeString(row.full_name);
  const techId = toMaybeString(row.tech_id);

  if (fullName) return fullName;
  if (techId) return techId;
  return "Unknown";
}

function resolveDetailRankValue(row: RosterRowLike) {
  const composite =
    typeof row.composite_score === "number" && Number.isFinite(row.composite_score)
      ? row.composite_score
      : null;

  return composite;
}

function resolveDetailRankDisplay(row: RosterRowLike) {
  if (
    typeof row.composite_display === "string" &&
    row.composite_display.trim()
  ) {
    return row.composite_display;
  }

  const composite = resolveDetailRankValue(row);
  return composite != null ? composite.toFixed(2) : null;
}

function toParityStableKey(label: string, group_type: ParityGroupType) {
  return `${group_type}::${label}`;
}

function formatValue(value: number | null, kpiKey: string) {
  if (value == null || !Number.isFinite(value)) return null;

  const normalized = String(kpiKey).trim().toLowerCase();
  if (normalized.includes("tnps")) {
    return value.toFixed(2);
  }

  return value.toFixed(1);
}

function resolveBandKey(
  value: number | null,
  rubric?: WorkforceRubricRow[]
): WorkforceMetricCell["band_key"] {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  if (!rubric?.length) return "NO_DATA";

  for (const row of rubric) {
    const minOk = row.min_value == null || value >= row.min_value;
    const maxOk = row.max_value == null || value <= row.max_value;
    if (minOk && maxOk) {
      return row.band_key;
    }
  }

  return "NO_DATA";
}

function normalizeDefinitions(definitions: KpiDefinition[]) {
  return [...definitions].sort((a, b) => {
    const aSort = a.sort_order ?? Number.POSITIVE_INFINITY;
    const bSort = b.sort_order ?? Number.POSITIVE_INFINITY;

    if (aSort !== bSort) return aSort - bSort;
    return a.label.localeCompare(b.label);
  });
}

function normalizeDirection(direction: string | null | undefined) {
  const upper = String(direction ?? "").trim().toUpperCase();

  if (
    upper === "LOWER" ||
    upper === "LOWER_BETTER" ||
    upper === "ASC" ||
    upper === "ASCENDING"
  ) {
    return "LOWER" as const;
  }

  return "HIGHER" as const;
}

function compareValuesForDirection(args: {
  a: number | null;
  b: number | null;
  direction?: string | null;
}) {
  const normalizedDirection = normalizeDirection(args.direction);

  const aValue =
    args.a == null || !Number.isFinite(args.a)
      ? normalizedDirection === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : args.a;

  const bValue =
    args.b == null || !Number.isFinite(args.b)
      ? normalizedDirection === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : args.b;

  if (normalizedDirection === "LOWER") {
    return aValue - bValue;
  }

  return bValue - aValue;
}

function toKpiDefinitionLike(definition: KpiDefinition): KpiDefinitionLike {
  return {
    kpi_key: definition.kpi_key,
    label: definition.label,
    customer_label: definition.label,
    raw_label_identifier: definition.label,
  };
}

function computeMetricFromFacts(
  facts: RawMetricPayload[],
  definition: KpiDefinition
): number | null {
  if (!facts.length) return null;

  return aggregateMetricFactsForKpi({
    def: toKpiDefinitionLike(definition),
    rows: facts,
  });
}

function computeComposite(
  metrics: WorkforceMetricCell[],
  definitions: KpiDefinition[]
): number | null {
  let weightedTotal = 0;
  let weightSum = 0;

  for (const def of definitions) {
    const metric = metrics.find((m) => m.kpi_key === def.kpi_key);
    const value = metric?.value;
    const weight = def.weight;

    if (value == null || !Number.isFinite(value)) continue;
    if (weight == null || !Number.isFinite(weight) || weight <= 0) continue;

    weightedTotal += value * weight;
    weightSum += weight;
  }

  if (weightSum <= 0) return null;
  return weightedTotal / weightSum;
}

function buildParityMetricCell(args: {
  definition: KpiDefinition;
  facts: RawMetricPayload[];
  rubric?: WorkforceRubricRow[];
}): WorkforceMetricCell {
  const value = computeMetricFromFacts(args.facts, args.definition);

  return {
    kpi_key: args.definition.kpi_key,
    label: args.definition.label,
    value,
    value_display: formatValue(value, args.definition.kpi_key),
    band_key: resolveBandKey(value, args.rubric),
    delta_value: null,
    delta_display: null,
    rank_value: null,
    rank_display: null,
    rank_delta_value: null,
    rank_delta_display: null,
    score_value: null,
    score_weight: args.definition.weight ?? null,
    score_contribution:
      value != null &&
      Number.isFinite(value) &&
      args.definition.weight != null &&
      Number.isFinite(args.definition.weight)
        ? value * args.definition.weight
        : null,
  };
}

function compareMetricEntries(a: RankedMetricEntry, b: RankedMetricEntry) {
  const byValue = compareValuesForDirection({
    a: a.cell.value,
    b: b.cell.value,
    direction: a.definition.direction,
  });

  if (byValue !== 0) return byValue;

  return a.row.label.localeCompare(b.row.label);
}

function assignMetricRanks(rows: ParityRow[], definitions: KpiDefinition[]) {
  const orderedDefinitions = normalizeDefinitions(definitions);

  for (const definition of orderedDefinitions) {
    const ranked = rows
      .map((row) => ({
        row,
        cell: row.metrics.find((metric) => metric.kpi_key === definition.kpi_key),
        definition,
      }))
      .filter((entry): entry is RankedMetricEntry => !!entry.cell)
      .sort(compareMetricEntries);

    let previousValue: number | null = null;
    let hasPrevious = false;
    let currentRank = 0;

    ranked.forEach((entry, index) => {
      const nextValue = entry.cell.value ?? null;
      const sameAsPrevious =
        hasPrevious &&
        previousValue != null &&
        nextValue != null &&
        previousValue === nextValue;

      if (!sameAsPrevious) {
        currentRank = index + 1;
      }

      entry.cell.rank_value = currentRank;
      entry.cell.rank_display = `#${currentRank}`;
      entry.cell.rank_delta_value = null;
      entry.cell.rank_delta_display = null;

      previousValue = nextValue;
      hasPrevious = true;
    });
  }

  return rows;
}

function applyOverallRanks(rows: ParityRow[], rankPopulation?: RankInputRow[]) {
  if (!rankPopulation?.length) {
    return rows;
  }

  const rankContext = resolveRankContextByTech(rankPopulation, {
    scopes: ["team"],
  });

  const sorted = [...rows].sort((a, b) => {
    const aKey = toParityStableKey(a.label, a.group_type);
    const bKey = toParityStableKey(b.label, b.group_type);

    const aSeat = rankContext.get(aKey)?.team ?? null;
    const bSeat = rankContext.get(bKey)?.team ?? null;

    const aRank = aSeat?.rank ?? Number.POSITIVE_INFINITY;
    const bRank = bSeat?.rank ?? Number.POSITIVE_INFINITY;

    if (aRank !== bRank) return aRank - bRank;

    return a.label.localeCompare(b.label);
  });

  for (const row of sorted) {
    const stableKey = toParityStableKey(row.label, row.group_type);
    const seat = rankContext.get(stableKey)?.team ?? null;

    row.rank_value = seat?.rank ?? null;
    row.rank_display = seat ? `#${seat.rank}` : null;
  }

  return sorted;
}

function buildDetailParityRows(args: Params): ParityRow[] {
  const { roster_rows, definitions } = args;
  const orderedDefinitions = normalizeDefinitions(definitions);

  const out: ParityRow[] = roster_rows.map((row) => {
    const metrics = orderedDefinitions.map((definition) => {
      const existing =
        row.metrics.find((metric) => metric.kpi_key === definition.kpi_key) ??
        null;

      if (existing) return { ...existing };

      return {
        kpi_key: definition.kpi_key,
        label: definition.label,
        value: null,
        value_display: null,
        band_key: "NO_DATA" as const,
        delta_value: null,
        delta_display: null,
        rank_value: null,
        rank_display: null,
        rank_delta_value: null,
        rank_delta_display: null,
        score_value: null,
        score_weight: definition.weight ?? null,
        score_contribution: null,
      } satisfies WorkforceMetricCell;
    });

    return {
      label: resolveDetailLabel(row),
      group_type: resolveGroupType(row),
      metrics,
      hc: 1,
      rank_value: resolveDetailRankValue(row),
      rank_display: resolveDetailRankDisplay(row),
    };
  });

  assignMetricRanks(out, orderedDefinitions);

  return [...out].sort((a, b) => {
    const av = a.rank_value ?? Number.NEGATIVE_INFINITY;
    const bv = b.rank_value ?? Number.NEGATIVE_INFINITY;

    if (bv !== av) return bv - av;
    return a.label.localeCompare(b.label);
  });
}

function buildSummaryParityRows(args: Params): ParityRow[] {
  const {
    definitions,
    roster_rows,
    rubricByKpi,
    metricFactsByTech,
    rank_population,
  } = args;

  const grouped = new Map<string, GroupBucket>();

  for (const row of roster_rows) {
    const group = normalizeSummaryGroupLabel(row);
    const key = toParityStableKey(group.label, group.group_type);

    const techId = toMaybeString(row.tech_id);
    const facts = techId
      ? ((metricFactsByTech?.get(techId) ?? []) as RawMetricPayload[])
      : [];

    const existing = grouped.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.facts.push(...facts);
      continue;
    }

    grouped.set(key, {
      label: group.label,
      group_type: group.group_type,
      rows: [row],
      facts: [...facts],
    });
  }

  const orderedDefinitions = normalizeDefinitions(definitions);

  const out: ParityRow[] = [];

  for (const group of grouped.values()) {
    const metrics = orderedDefinitions.map((definition) =>
      buildParityMetricCell({
        definition,
        facts: group.facts,
        rubric: rubricByKpi?.get(definition.kpi_key),
      })
    );

    const composite = computeComposite(metrics, orderedDefinitions);

    out.push({
      label: group.label,
      group_type: group.group_type,
      hc: group.rows.length,
      rank_value: composite,
      rank_display: composite != null ? composite.toFixed(2) : null,
      metrics,
    });
  }

  assignMetricRanks(out, orderedDefinitions);

  if (out.some((row) => row.rank_value != null)) {
    return [...out].sort((a, b) => {
      const av = a.rank_value ?? Number.NEGATIVE_INFINITY;
      const bv = b.rank_value ?? Number.NEGATIVE_INFINITY;
      if (bv !== av) return bv - av;
      return a.label.localeCompare(b.label);
    });
  }

  return applyOverallRanks(out, rank_population);
}

export function buildParityRows(params: Params): ParityRow[] {
  const mode = params.mode ?? "summary";

  if (mode === "detail") {
    return buildDetailParityRows(params);
  }

  return buildSummaryParityRows(params);
}

// path: src/shared/kpis/engine/buildParityRows.ts