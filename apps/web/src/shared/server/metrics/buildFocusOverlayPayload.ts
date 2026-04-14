// path: apps/web/src/shared/server/metrics/buildFocusOverlayPayload.ts

import type {
  MetricsParticipationOverlay,
  MetricsParticipationOverlayMetric,
  MetricsParticipationOverlayRow,
  MetricsPriorityKpiOverlay,
  MetricsRiskTrendDirection,
  MetricsTopPriorityOverlay,
  MetricsTopPriorityOverlayRow,
} from "@/shared/types/metrics/surfacePayload";

type DefinitionRow = {
  profile_key: string;
  kpi_key: string;
  label: string;
  customer_label: string;
  raw_label_identifier: string;
  direction: string | null;
  sort_order: number;
  report_order: number | null;
  weight: number | null;
};

type ScoreLikeRow = {
  tech_id: string;
  metric_key: string;
  metric_value: number | null;
  band_key: string | null;
};

type TechIdentity = {
  tech_id: string;
  full_name: string | null;
  rank: number | null;
};

function buildTechIdentityMap(
  teamRows: TechIdentity[]
): Map<string, TechIdentity> {
  const map = new Map<string, TechIdentity>();
  for (const row of teamRows) {
    if (!row.tech_id) continue;
    map.set(row.tech_id, row);
  }
  return map;
}

function buildScoreLookupMap(rows: ScoreLikeRow[]): Map<string, ScoreLikeRow> {
  const map = new Map<string, ScoreLikeRow>();
  for (const row of rows) {
    map.set(`${row.tech_id}::${row.metric_key}`, row);
  }
  return map;
}

function resolveTrendDirection(args: {
  direction: string | null;
  currentValue: number | null;
  previousValue: number | null;
}): MetricsRiskTrendDirection {
  if (
    typeof args.currentValue !== "number" ||
    !Number.isFinite(args.currentValue) ||
    typeof args.previousValue !== "number" ||
    !Number.isFinite(args.previousValue)
  ) {
    return null;
  }

  if (args.currentValue === args.previousValue) return "flat";

  if (args.direction === "HIGHER_BETTER") {
    return args.currentValue > args.previousValue ? "up" : "down";
  }

  if (args.direction === "LOWER_BETTER") {
    return args.currentValue < args.previousValue ? "up" : "down";
  }

  return null;
}

function buildTopPriorityRows(args: {
  techIds: string[];
  kpi_key: string | null;
  definitions: DefinitionRow[];
  techIdentityById: Map<string, TechIdentity>;
  currentScoreByTechMetric: Map<string, ScoreLikeRow>;
  previousScoreByTechMetric: Map<string, ScoreLikeRow>;
}): MetricsTopPriorityOverlayRow[] {
  if (!args.kpi_key) return [];

  const definition = args.definitions.find((d) => d.kpi_key === args.kpi_key);
  const direction = definition?.direction ?? null;

  return args.techIds.map((techId) => {
    const identity = args.techIdentityById.get(techId);
    const current =
      args.currentScoreByTechMetric.get(`${techId}::${args.kpi_key}`) ?? null;
    const previous =
      args.previousScoreByTechMetric.get(`${techId}::${args.kpi_key}`) ?? null;

    return {
      tech_id: techId,
      full_name: identity?.full_name ?? null,
      rank: identity?.rank ?? null,
      metric_value: current?.metric_value ?? null,
      band_key: current?.band_key ?? null,
      trend_direction: resolveTrendDirection({
        direction,
        currentValue: current?.metric_value ?? null,
        previousValue: previous?.metric_value ?? null,
      }),
    };
  });
}

function buildParticipationRows(args: {
  techIds: string[];
  scopedDefinitions: DefinitionRow[];
  techIdentityById: Map<string, TechIdentity>;
  currentScoreByTechMetric: Map<string, ScoreLikeRow>;
}): MetricsParticipationOverlayRow[] {
  return args.techIds.map((techId) => {
    const identity = args.techIdentityById.get(techId);

    const metrics: MetricsParticipationOverlayMetric[] =
      args.scopedDefinitions.map((def) => {
        const current =
          args.currentScoreByTechMetric.get(`${techId}::${def.kpi_key}`) ?? null;

        return {
          kpi_key: def.kpi_key,
          label: def.customer_label || def.label,
          value: current?.metric_value ?? null,
          band_key: current?.band_key ?? null,
        };
      });

    return {
      tech_id: techId,
      full_name: identity?.full_name ?? null,
      rank: identity?.rank ?? null,
      metrics,
    };
  });
}

function buildPriorityKpiOverlays(args: {
  priorityKpis: Array<{
    kpi_key: string;
    label: string;
    new_tech_ids: string[];
    persistent_tech_ids: string[];
    recovered_tech_ids: string[];
  }>;
  definitions: DefinitionRow[];
  techIdentityById: Map<string, TechIdentity>;
  currentScoreByTechMetric: Map<string, ScoreLikeRow>;
  previousScoreByTechMetric: Map<string, ScoreLikeRow>;
}): MetricsPriorityKpiOverlay[] {
  return args.priorityKpis.map((kpi) => ({
    kpi_key: kpi.kpi_key,
    label: kpi.label,
    new_rows: buildTopPriorityRows({
      techIds: kpi.new_tech_ids,
      kpi_key: kpi.kpi_key,
      definitions: args.definitions,
      techIdentityById: args.techIdentityById,
      currentScoreByTechMetric: args.currentScoreByTechMetric,
      previousScoreByTechMetric: args.previousScoreByTechMetric,
    }),
    persistent_rows: buildTopPriorityRows({
      techIds: kpi.persistent_tech_ids,
      kpi_key: kpi.kpi_key,
      definitions: args.definitions,
      techIdentityById: args.techIdentityById,
      currentScoreByTechMetric: args.currentScoreByTechMetric,
      previousScoreByTechMetric: args.previousScoreByTechMetric,
    }),
    recovered_rows: buildTopPriorityRows({
      techIds: kpi.recovered_tech_ids,
      kpi_key: kpi.kpi_key,
      definitions: args.definitions,
      techIdentityById: args.techIdentityById,
      currentScoreByTechMetric: args.currentScoreByTechMetric,
      previousScoreByTechMetric: args.previousScoreByTechMetric,
    }),
  }));
}

export function buildFocusOverlayPayload(args: {
  definitions: DefinitionRow[];
  teamRows: Array<{
    tech_id: string;
    full_name: string | null;
    rank: number | null;
  }>;
  currentScoreRows: ScoreLikeRow[];
  previousScoreRows: ScoreLikeRow[];
  topPriority: {
    kpi_key: string | null;
    new_tech_ids: string[];
    persistent_tech_ids: string[];
    recovered_tech_ids: string[];
  };
  priorityKpis?: Array<{
    kpi_key: string;
    label: string;
    new_tech_ids: string[];
    persistent_tech_ids: string[];
    recovered_tech_ids: string[];
  }>;
  participation: {
    meets_3: { tech_ids: string[] };
    meets_2: { tech_ids: string[] };
    meets_1: { tech_ids: string[] };
    meets_0: { tech_ids: string[] };
  };
}): {
  top_priority_kpi_overlay: MetricsTopPriorityOverlay;
  priority_kpi_overlays: MetricsPriorityKpiOverlay[];
  participation_overlay: MetricsParticipationOverlay;
} {
  const techIdentityById = buildTechIdentityMap(args.teamRows);
  const currentScoreByTechMetric = buildScoreLookupMap(args.currentScoreRows);
  const previousScoreByTechMetric = buildScoreLookupMap(args.previousScoreRows);

  const scopedDefinitions = [...args.definitions]
    .filter((def) => (def.weight ?? 0) > 0)
    .sort((a, b) => {
      const ao = a.report_order ?? 999;
      const bo = b.report_order ?? 999;
      if (ao !== bo) return ao - bo;
      return a.kpi_key.localeCompare(b.kpi_key);
    })
    .slice(0, 3);

  return {
    top_priority_kpi_overlay: {
      new_rows: buildTopPriorityRows({
        techIds: args.topPriority.new_tech_ids,
        kpi_key: args.topPriority.kpi_key,
        definitions: args.definitions,
        techIdentityById,
        currentScoreByTechMetric,
        previousScoreByTechMetric,
      }),
      persistent_rows: buildTopPriorityRows({
        techIds: args.topPriority.persistent_tech_ids,
        kpi_key: args.topPriority.kpi_key,
        definitions: args.definitions,
        techIdentityById,
        currentScoreByTechMetric,
        previousScoreByTechMetric,
      }),
      recovered_rows: buildTopPriorityRows({
        techIds: args.topPriority.recovered_tech_ids,
        kpi_key: args.topPriority.kpi_key,
        definitions: args.definitions,
        techIdentityById,
        currentScoreByTechMetric,
        previousScoreByTechMetric,
      }),
    },
    priority_kpi_overlays: buildPriorityKpiOverlays({
      priorityKpis: args.priorityKpis ?? [],
      definitions: args.definitions,
      techIdentityById,
      currentScoreByTechMetric,
      previousScoreByTechMetric,
    }),
    participation_overlay: {
      meets_3_rows: buildParticipationRows({
        techIds: args.participation.meets_3.tech_ids,
        scopedDefinitions,
        techIdentityById,
        currentScoreByTechMetric,
      }),
      meets_2_rows: buildParticipationRows({
        techIds: args.participation.meets_2.tech_ids,
        scopedDefinitions,
        techIdentityById,
        currentScoreByTechMetric,
      }),
      meets_1_rows: buildParticipationRows({
        techIds: args.participation.meets_1.tech_ids,
        scopedDefinitions,
        techIdentityById,
        currentScoreByTechMetric,
      }),
      meets_0_rows: buildParticipationRows({
        techIds: args.participation.meets_0.tech_ids,
        scopedDefinitions,
        techIdentityById,
        currentScoreByTechMetric,
      }),
    },
  };
}