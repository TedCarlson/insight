// path: apps/web/src/shared/lib/metrics/scopedComputations.ts

import type { MetricsExecutiveKpiItem } from "@/shared/types/metrics/executiveStrip";
import type {
  MetricsParticipationOverlay,
  MetricsParticipationOverlayRow,
  MetricsParticipationSignal,
  MetricsParticipationSignalKpi,
  MetricsPriorityKpiOverlay,
  MetricsRiskInsightKpiMovement,
  MetricsRiskInsightPerformer,
  MetricsRiskInsights,
  MetricsTopPriorityOverlay,
  MetricsTopPriorityOverlayRow,
} from "@/shared/types/metrics/surfacePayload";
import type { TeamRowClient } from "./buildScopedRows";

/**
 * Locked convention:
 * - no averages across org-level aggregates
 * - no fabricated KPI math in the client
 *
 * Current scoped executive behavior:
 * - temporary null-safe pass-through only
 * - real scoped strip payload must come from server payload assembly
 */

function isPassBand(bandKey?: string | null) {
  return bandKey === "EXCEEDS" || bandKey === "MEETS";
}

function isFailBand(bandKey?: string | null) {
  return bandKey === "NEEDS_IMPROVEMENT" || bandKey === "MISSES";
}

function isMissBand(bandKey?: string | null) {
  return bandKey === "MISSES";
}

function deriveParticipationBand(score: number) {
  if (score >= 95) return "EXCEEDS";
  if (score >= 85) return "MEETS";
  if (score >= 70) return "NEEDS_IMPROVEMENT";
  return "MISSES";
}

function metricMap(row: TeamRowClient) {
  return new Map(row.metrics.map((metric) => [metric.metric_key, metric]));
}

function resolveFtrMetricKey(rows: TeamRowClient[]): string | null {
  const sampleMetrics = rows.flatMap((row) => row.metrics);

  const exact = sampleMetrics.find((metric) => metric.metric_key === "ftr_rate");
  if (exact) return exact.metric_key;

  const fuzzy = sampleMetrics.find((metric) => {
    const key = String(metric.metric_key ?? "").toLowerCase();
    const label = String(metric.label ?? "").toLowerCase();
    return key.includes("ftr") || label.includes("ftr");
  });

  return fuzzy?.metric_key ?? null;
}

function hasPositiveFtrContactJobs(
  row: TeamRowClient,
  ftrMetricKey: string | null
): boolean {
  if (!ftrMetricKey) return true;

  const ftrMetric =
    row.metrics.find((metric) => metric.metric_key === ftrMetricKey) ?? null;

  const denominator = ftrMetric?.denominator;
  return typeof denominator === "number" && Number.isFinite(denominator)
    ? denominator > 0
    : false;
}

function filterEligibleRows(rows: TeamRowClient[]): TeamRowClient[] {
  const ftrMetricKey = resolveFtrMetricKey(rows);
  return rows.filter((row) => hasPositiveFtrContactJobs(row, ftrMetricKey));
}

function filterOverlayRows(
  rows: MetricsTopPriorityOverlayRow[] | undefined,
  scopedTechIds: Set<string>
) {
  return (rows ?? []).filter((row) => scopedTechIds.has(row.tech_id));
}

function filterParticipationOverlayRows(
  rows: MetricsParticipationOverlayRow[] | undefined,
  scopedTechIds: Set<string>
) {
  return (rows ?? []).filter((row) => scopedTechIds.has(row.tech_id));
}

function buildPerformer(
  row: TeamRowClient,
  riskCountByTech: Map<string, number>
): MetricsRiskInsightPerformer {
  const failedMetric = row.metrics.find((metric) =>
    isFailBand(metric.render_band_key)
  );

  return {
    tech_id: String(row.tech_id ?? ""),
    full_name: row.full_name ?? null,
    rank: row.rank ?? null,
    composite_score: row.composite_score ?? null,
    risk_count: riskCountByTech.get(String(row.tech_id ?? "")) ?? 0,
    streak_count: null,
    primary_kpi_key: failedMetric?.metric_key ?? null,
    primary_kpi_label: failedMetric?.label ?? failedMetric?.metric_key ?? null,
  };
}

export function buildScopedExecutiveItems(args: {
  sourceItems?: MetricsExecutiveKpiItem[];
  scopedRows: TeamRowClient[];
  allRows: TeamRowClient[];
}): MetricsExecutiveKpiItem[] {
  void args.scopedRows;
  void args.allRows;
  return [...(args.sourceItems ?? [])];
}

export function buildScopedWorkMix(rows: TeamRowClient[]) {
  let total = 0;
  let installs = 0;
  let tcs = 0;
  let sros = 0;

  rows.forEach((row) => {
    const mix = row.work_mix;
    if (!mix) return;

    total += mix.total ?? 0;
    installs += mix.installs ?? 0;
    tcs += mix.tcs ?? 0;
    sros += mix.sros ?? 0;
  });

  if (total <= 0) return null;

  return {
    total,
    installs,
    tcs,
    sros,
    install_pct: installs / total,
    tc_pct: tcs / total,
    sro_pct: sros / total,
  };
}

function buildScopedParticipationSignal(args: {
  eligibleRows: TeamRowClient[];
  priorityKpis: MetricsRiskInsightKpiMovement[];
  sourceSignal?: MetricsParticipationSignal | null;
}): MetricsParticipationSignal | null {
  const eligibleCount = args.eligibleRows.length;
  if (!eligibleCount || !args.priorityKpis.length) return null;

  const sourceByKpi = new Map(
    (args.sourceSignal?.by_kpi ?? []).map((item) => [item.kpi_key, item])
  );

  const by_kpi: MetricsParticipationSignalKpi[] = args.priorityKpis.map((kpi) => {
    const participatingCount = args.eligibleRows.reduce((sum, row) => {
      const metric = row.metrics.find((item) => item.metric_key === kpi.kpi_key);
      return sum + (isPassBand(metric?.render_band_key) ? 1 : 0);
    }, 0);

    const score = eligibleCount > 0 ? (participatingCount / eligibleCount) * 100 : 0;
    const source = sourceByKpi.get(kpi.kpi_key);

    return {
      kpi_key: kpi.kpi_key,
      label: kpi.label,
      score,
      band_key: deriveParticipationBand(score),
      trend_delta: source?.trend_delta ?? null,
      trend_direction: source?.trend_direction ?? null,
      participating_count: participatingCount,
      eligible_count: eligibleCount,
    };
  });

  const totalScore = by_kpi.reduce((sum, item) => sum + item.score, 0);
  const overallScore = by_kpi.length > 0 ? totalScore / by_kpi.length : 0;
  const sourceOverall = args.sourceSignal ?? null;

  return {
    by_kpi,
    overall_score: overallScore,
    overall_band_key: deriveParticipationBand(overallScore),
    trend_delta: sourceOverall?.trend_delta ?? null,
    trend_direction: sourceOverall?.trend_direction ?? null,
    eligible_count: eligibleCount,
  };
}

function buildScopedPriorityKpis(args: {
  eligibleRows: TeamRowClient[];
  source: MetricsRiskInsights;
  scopedTechIds: Set<string>;
}): MetricsRiskInsightKpiMovement[] {
  const prioritySeed =
    args.source.priority_kpis && args.source.priority_kpis.length > 0
      ? args.source.priority_kpis
      : args.source.top_priority_kpi.kpi_key && args.source.top_priority_kpi.label
        ? [
            {
              kpi_key: args.source.top_priority_kpi.kpi_key,
              label: args.source.top_priority_kpi.label,
              miss_count: args.source.top_priority_kpi.miss_count,
              tech_ids: args.source.top_priority_kpi.tech_ids,
              new_tech_ids: args.source.top_priority_kpi.new_tech_ids,
              persistent_tech_ids: args.source.top_priority_kpi.persistent_tech_ids,
              recovered_tech_ids: args.source.top_priority_kpi.recovered_tech_ids,
            },
          ]
        : [];

  return prioritySeed
    .map((kpi) => {
      const techIds: string[] = [];

      const missCount = args.eligibleRows.reduce((sum, row) => {
        const techId = String(row.tech_id ?? "").trim();
        if (!techId) return sum;

        const metric = row.metrics.find((item) => item.metric_key === kpi.kpi_key);
        if (!isMissBand(metric?.render_band_key)) return sum;

        techIds.push(techId);
        return sum + 1;
      }, 0);

      return {
        ...kpi,
        miss_count: missCount,
        tech_ids: techIds,
        new_tech_ids: (kpi.new_tech_ids ?? []).filter((id) =>
          args.scopedTechIds.has(id)
        ),
        persistent_tech_ids: (kpi.persistent_tech_ids ?? []).filter((id) =>
          args.scopedTechIds.has(id)
        ),
        recovered_tech_ids: (kpi.recovered_tech_ids ?? []).filter((id) =>
          args.scopedTechIds.has(id)
        ),
      };
    })
    .sort((a, b) => {
      if (b.miss_count !== a.miss_count) return b.miss_count - a.miss_count;
      return a.label.localeCompare(b.label);
    });
}

function buildScopedParticipation(args: {
  eligibleRows: TeamRowClient[];
  priorityKpis: MetricsRiskInsightKpiMovement[];
}) {
  const topThree = args.priorityKpis.slice(0, 3).map((kpi) => kpi.kpi_key);

  const meets3TechIds: string[] = [];
  const meets2TechIds: string[] = [];
  const meets1TechIds: string[] = [];
  const meets0TechIds: string[] = [];

  for (const row of args.eligibleRows) {
    const metricsByKey = metricMap(row);

    let passCount = 0;
    for (const kpiKey of topThree) {
      const metric = metricsByKey.get(kpiKey);
      if (isPassBand(metric?.render_band_key)) {
        passCount += 1;
      }
    }

    const techId = String(row.tech_id ?? "").trim();
    if (!techId) continue;

    if (passCount >= 3) {
      meets3TechIds.push(techId);
    } else if (passCount === 2) {
      meets2TechIds.push(techId);
    } else if (passCount === 1) {
      meets1TechIds.push(techId);
    } else {
      meets0TechIds.push(techId);
    }
  }

  return {
    meets_3: {
      count: meets3TechIds.length,
      tech_ids: meets3TechIds,
    },
    meets_2: {
      count: meets2TechIds.length,
      tech_ids: meets2TechIds,
    },
    meets_1: {
      count: meets1TechIds.length,
      tech_ids: meets1TechIds,
    },
    meets_0: {
      count: meets0TechIds.length,
      tech_ids: meets0TechIds,
    },
  };
}

function buildScopedPerformers(args: { eligibleRows: TeamRowClient[] }) {
  const riskCountByTech = new Map<string, number>();

  for (const row of args.eligibleRows) {
    const techId = String(row.tech_id ?? "").trim();
    if (!techId) continue;

    const riskCount = row.metrics.reduce((sum, metric) => {
      return sum + (isFailBand(metric.render_band_key) ? 1 : 0);
    }, 0);

    riskCountByTech.set(techId, riskCount);
  }

  const sorted = [...args.eligibleRows].sort((a, b) => {
    const compA =
      typeof a.composite_score === "number" && Number.isFinite(a.composite_score)
        ? a.composite_score
        : -1;
    const compB =
      typeof b.composite_score === "number" && Number.isFinite(b.composite_score)
        ? b.composite_score
        : -1;

    if (compA !== compB) return compB - compA;

    const rankA =
      typeof a.rank === "number" && Number.isFinite(a.rank) ? a.rank : 999999;
    const rankB =
      typeof b.rank === "number" && Number.isFinite(b.rank) ? b.rank : 999999;

    return rankA - rankB;
  });

  const count = sorted.length;
  const limit = count >= 10 ? 5 : count >= 5 ? 3 : 1;

  return {
    riskCountByTech,
    top_performers: sorted
      .slice(0, limit)
      .map((row) => buildPerformer(row, riskCountByTech)),
    bottom_performers: [...sorted]
      .reverse()
      .slice(0, limit)
      .map((row) => buildPerformer(row, riskCountByTech)),
  };
}

function buildScopedTopPriorityOverlay(args: {
  source: MetricsTopPriorityOverlay | null | undefined;
  scopedTechIds: Set<string>;
}): MetricsTopPriorityOverlay | null {
  if (!args.source) return null;

  return {
    new_rows: filterOverlayRows(args.source.new_rows, args.scopedTechIds),
    persistent_rows: filterOverlayRows(args.source.persistent_rows, args.scopedTechIds),
    recovered_rows: filterOverlayRows(args.source.recovered_rows, args.scopedTechIds),
  };
}

function buildScopedPriorityKpiOverlays(args: {
  source: MetricsPriorityKpiOverlay[] | null | undefined;
  scopedTechIds: Set<string>;
}): MetricsPriorityKpiOverlay[] | null {
  if (!args.source) return null;

  return args.source.map((overlay) => ({
    ...overlay,
    new_rows: filterOverlayRows(overlay.new_rows, args.scopedTechIds),
    persistent_rows: filterOverlayRows(overlay.persistent_rows, args.scopedTechIds),
    recovered_rows: filterOverlayRows(overlay.recovered_rows, args.scopedTechIds),
  }));
}

function buildScopedParticipationOverlay(args: {
  source: MetricsParticipationOverlay | null | undefined;
  scopedTechIds: Set<string>;
}): MetricsParticipationOverlay | null {
  if (!args.source) return null;

  return {
    meets_3_rows: filterParticipationOverlayRows(
      args.source.meets_3_rows,
      args.scopedTechIds
    ),
    meets_2_rows: filterParticipationOverlayRows(
      args.source.meets_2_rows,
      args.scopedTechIds
    ),
    meets_1_rows: filterParticipationOverlayRows(
      args.source.meets_1_rows,
      args.scopedTechIds
    ),
    meets_0_rows: filterParticipationOverlayRows(
      args.source.meets_0_rows,
      args.scopedTechIds
    ),
  };
}

export function buildScopedRiskInsights(args: {
  source: MetricsRiskInsights | null | undefined;
  scopedRows: TeamRowClient[];
}): MetricsRiskInsights | null {
  if (!args.source) return null;

  const eligibleRows = filterEligibleRows(args.scopedRows);

  const scopedTechIds = new Set(
    eligibleRows.map((row) => String(row.tech_id ?? "").trim()).filter(Boolean)
  );

  const scopedPriorityKpis = buildScopedPriorityKpis({
    eligibleRows,
    source: args.source,
    scopedTechIds,
  });

  const scopedTopPriority = scopedPriorityKpis[0] ?? null;

  const scopedParticipation = buildScopedParticipation({
    eligibleRows,
    priorityKpis: scopedPriorityKpis,
  });

  const scopedParticipationSignal = buildScopedParticipationSignal({
    eligibleRows,
    priorityKpis: scopedPriorityKpis.slice(0, 3),
    sourceSignal: args.source.participation_signal ?? null,
  });

  const performers = buildScopedPerformers({
    eligibleRows,
  });

  const scopedTopPriorityOverlay = buildScopedTopPriorityOverlay({
    source: args.source.top_priority_kpi_overlay ?? null,
    scopedTechIds,
  });

  const scopedPriorityKpiOverlays = buildScopedPriorityKpiOverlays({
    source: args.source.priority_kpi_overlays ?? null,
    scopedTechIds,
  });

  const scopedParticipationOverlay = buildScopedParticipationOverlay({
    source: args.source.participation_overlay ?? null,
    scopedTechIds,
  });

  return {
    ...args.source,
    top_priority_kpi: {
      kpi_key: scopedTopPriority?.kpi_key ?? null,
      label: scopedTopPriority?.label ?? null,
      miss_count: scopedTopPriority?.miss_count ?? 0,
      tech_ids: scopedTopPriority?.tech_ids ?? [],
      new_tech_ids: scopedTopPriority?.new_tech_ids ?? [],
      persistent_tech_ids: scopedTopPriority?.persistent_tech_ids ?? [],
      recovered_tech_ids: scopedTopPriority?.recovered_tech_ids ?? [],
    },
    priority_kpis: scopedPriorityKpis,
    participation: scopedParticipation,
    participation_signal: scopedParticipationSignal,
    top_performers: performers.top_performers,
    bottom_performers: performers.bottom_performers,
    top_priority_kpi_overlay: scopedTopPriorityOverlay,
    priority_kpi_overlays: scopedPriorityKpiOverlays,
    participation_overlay: scopedParticipationOverlay,
  };
}