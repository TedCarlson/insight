// path: apps/web/src/features/role-company-manager/components/CompanyManagerScopedViewClient.tsx

"use client";

import { useMemo, useState } from "react";

import MetricsControlsStrip from "@/shared/surfaces/MetricsControlsStrip";
import MetricsExecutiveKpiStrip, {
  type MetricsExecutiveKpiItem,
} from "@/shared/surfaces/MetricsExecutiveKpiStrip";
import MetricsRiskStrip from "@/shared/surfaces/MetricsRiskStrip";
import MetricsTeamPerformanceTableClient from "@/shared/surfaces/MetricsTeamPerformanceTableClient";
import {
  buildScopedRows,
  mapTeamRows,
  type MetricsControlsValue,
  type TeamRowClient,
} from "@/shared/lib/metrics/buildScopedRows";
import type {
  MetricsParticipationSignal,
  MetricsParticipationSignalKpi,
  MetricsRiskInsightKpiMovement,
  MetricsRiskInsights,
  MetricsSurfacePayload,
  MetricsTopPriorityOverlayRow,
} from "@/shared/types/metrics/surfacePayload";

import { useScopedTeamControls } from "../hooks/useScopedTeamControls";

type Props = {
  payload: MetricsSurfacePayload;
};

type SupervisorOption = {
  value: string;
  label: string;
};

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function bandLabelFromKey(bandKey: string) {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function comparisonStateFromDelta(delta: number) {
  if (delta > 0) return "better" as const;
  if (delta < 0) return "worse" as const;
  return "neutral" as const;
}

function average(values: Array<number | null | undefined>) {
  const clean = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function resolveBandKeyForValue(args: {
  kpiKey: string;
  value: number | null;
  sourceItems: MetricsExecutiveKpiItem[];
}) {
  const source = args.sourceItems.find((item) => item.kpi_key === args.kpiKey);
  if (!source || args.value == null) return "NO_DATA";
  return source.band_key ?? "NO_DATA";
}

function formatValueDisplay(kpiKey: string, value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (kpiKey === "tnps_score") return value.toFixed(1);
  return value.toFixed(1);
}

function deriveParticipationBand(score: number) {
  if (score >= 95) return "EXCEEDS";
  if (score >= 85) return "MEETS";
  if (score >= 70) return "NEEDS_IMPROVEMENT";
  return "MISSES";
}

function isPassBand(bandKey?: string | null) {
  return bandKey === "EXCEEDS" || bandKey === "MEETS";
}

function isFailBand(bandKey?: string | null) {
  return bandKey === "NEEDS_IMPROVEMENT" || bandKey === "MISSES";
}

function isMissBand(bandKey?: string | null) {
  return bandKey === "MISSES";
}

function metricMap(row: TeamRowClient) {
  return new Map(row.metrics.map((metric) => [metric.metric_key, metric]));
}

function buildScopedExecutiveItems(args: {
  sourceItems: MetricsExecutiveKpiItem[];
  scopedRows: TeamRowClient[];
  allRows: TeamRowClient[];
}): MetricsExecutiveKpiItem[] {
  const metricValueMap = new Map<
    string,
    { scoped: number | null; full: number | null }
  >();

  const orderedKeys = args.sourceItems.map((item) => item.kpi_key);

  for (const kpiKey of orderedKeys) {
    const scopedValue = average(
      args.scopedRows.map(
        (row) =>
          row.metrics.find((metric) => metric.metric_key === kpiKey)
            ?.metric_value
      )
    );

    const fullValue = average(
      args.allRows.map(
        (row) =>
          row.metrics.find((metric) => metric.metric_key === kpiKey)
            ?.metric_value
      )
    );

    metricValueMap.set(kpiKey, {
      scoped: scopedValue,
      full: fullValue,
    });
  }

  return args.sourceItems.map((item) => {
    const values = metricValueMap.get(item.kpi_key) ?? {
      scoped: null,
      full: null,
    };
    const scopedValue = values.scoped;
    const fullValue = values.full;

    const delta =
      typeof scopedValue === "number" &&
      Number.isFinite(scopedValue) &&
      typeof fullValue === "number" &&
      Number.isFinite(fullValue)
        ? scopedValue - fullValue
        : null;

    const bandKey = resolveBandKeyForValue({
      kpiKey: item.kpi_key,
      value: scopedValue,
      sourceItems: args.sourceItems,
    });

    return {
      ...item,
      value_display: formatValueDisplay(item.kpi_key, scopedValue),
      comparison_value_display: formatValueDisplay(item.kpi_key, fullValue),
      comparison_scope_code: "ORG",
      variance_display:
        typeof delta === "number" && Number.isFinite(delta)
          ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`
          : "—",
      comparison_state:
        typeof delta === "number" && Number.isFinite(delta)
          ? comparisonStateFromDelta(delta)
          : "neutral",
      band_key: bandKey,
      band_label: bandLabelFromKey(bandKey),
    };
  });
}

function buildScopedWorkMix(rows: TeamRowClient[]) {
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

function filterOverlayRows(
  rows: MetricsTopPriorityOverlayRow[] | undefined,
  scopedTechIds: Set<string>
) {
  return (rows ?? []).filter((row) => scopedTechIds.has(row.tech_id));
}

function buildScopedParticipationSignal(args: {
  scopedRows: TeamRowClient[];
  priorityKpis: MetricsRiskInsightKpiMovement[];
  sourceSignal?: MetricsParticipationSignal | null;
}): MetricsParticipationSignal | null {
  const eligibleCount = args.scopedRows.length;
  if (!eligibleCount || !args.priorityKpis.length) return null;

  const sourceByKpi = new Map(
    (args.sourceSignal?.by_kpi ?? []).map((item) => [item.kpi_key, item])
  );

  const by_kpi: MetricsParticipationSignalKpi[] = args.priorityKpis.map(
    (kpi) => {
      const participatingCount = args.scopedRows.reduce((sum, row) => {
        const metric = row.metrics.find(
          (item) => item.metric_key === kpi.kpi_key
        );
        return sum + (isPassBand(metric?.render_band_key) ? 1 : 0);
      }, 0);

      const score =
        eligibleCount > 0 ? (participatingCount / eligibleCount) * 100 : 0;
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
    }
  );

  const overallScore = average(by_kpi.map((item) => item.score)) ?? 0;
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

function buildScopedRiskInsights(args: {
  source: MetricsRiskInsights | null | undefined;
  scopedRows: TeamRowClient[];
}) {
  if (!args.source) return null;

  const scopedTechIds = new Set(
    args.scopedRows
      .map((row) => String(row.tech_id ?? "").trim())
      .filter(Boolean)
  );

  const prioritySeed =
    args.source.priority_kpis && args.source.priority_kpis.length > 0
      ? args.source.priority_kpis
      : args.source.top_priority_kpi.kpi_key && args.source.top_priority_kpi.label
        ? [
            {
              kpi_key: args.source.top_priority_kpi.kpi_key,
              label: args.source.top_priority_kpi.label,
              miss_count: 0,
              tech_ids: [],
              new_tech_ids: [],
              persistent_tech_ids: [],
              recovered_tech_ids: [],
            },
          ]
        : [];

  const scopedPriorityKpis: MetricsRiskInsightKpiMovement[] = prioritySeed
    .map((kpi) => {
      const techIds: string[] = [];
      const missCount = args.scopedRows.reduce((sum, row) => {
        const techId = String(row.tech_id ?? "").trim();
        if (!techId) return sum;

        const metric = row.metrics.find(
          (item) => item.metric_key === kpi.kpi_key
        );
        if (!isMissBand(metric?.render_band_key)) return sum;

        techIds.push(techId);
        return sum + 1;
      }, 0);

      return {
        ...kpi,
        miss_count: missCount,
        tech_ids: techIds,
        new_tech_ids: kpi.new_tech_ids.filter((id) => scopedTechIds.has(id)),
        persistent_tech_ids: kpi.persistent_tech_ids.filter((id) =>
          scopedTechIds.has(id)
        ),
        recovered_tech_ids: kpi.recovered_tech_ids.filter((id) =>
          scopedTechIds.has(id)
        ),
      };
    })
    .sort((a, b) => {
      if (b.miss_count !== a.miss_count) return b.miss_count - a.miss_count;
      return a.label.localeCompare(b.label);
    });

  const scopedTopPriority = scopedPriorityKpis[0] ?? null;
  const scopedKpiKeys = scopedPriorityKpis
    .slice(0, 3)
    .map((item) => item.kpi_key);

  const participationCounts = {
    meets_3: { count: 0, tech_ids: [] as string[] },
    meets_2: { count: 0, tech_ids: [] as string[] },
    meets_1: { count: 0, tech_ids: [] as string[] },
    meets_0: { count: 0, tech_ids: [] as string[] },
  };

  const riskCountByTech = new Map<string, number>();

  args.scopedRows.forEach((row) => {
    const techId = String(row.tech_id ?? "").trim();
    if (!techId) return;

    const metricsByKey = metricMap(row);

    let passCount = 0;
    let totalRiskCount = 0;

    row.metrics.forEach((metric) => {
      if (isFailBand(metric.render_band_key)) {
        totalRiskCount += 1;
      }
    });

    scopedKpiKeys.forEach((kpiKey) => {
      const metric = metricsByKey.get(kpiKey);
      if (isPassBand(metric?.render_band_key)) {
        passCount += 1;
      }
    });

    riskCountByTech.set(techId, totalRiskCount);

    if (passCount >= 3) {
      participationCounts.meets_3.count += 1;
      participationCounts.meets_3.tech_ids.push(techId);
    } else if (passCount === 2) {
      participationCounts.meets_2.count += 1;
      participationCounts.meets_2.tech_ids.push(techId);
    } else if (passCount === 1) {
      participationCounts.meets_1.count += 1;
      participationCounts.meets_1.tech_ids.push(techId);
    } else {
      participationCounts.meets_0.count += 1;
      participationCounts.meets_0.tech_ids.push(techId);
    }
  });

  const sortedByRiskThenComposite = [...args.scopedRows].sort((a, b) => {
    const techA = String(a.tech_id ?? "").trim();
    const techB = String(b.tech_id ?? "").trim();

    const riskA = riskCountByTech.get(techA) ?? 0;
    const riskB = riskCountByTech.get(techB) ?? 0;
    if (riskA !== riskB) return riskA - riskB;

    const compA =
      typeof a.composite_score === "number" && Number.isFinite(a.composite_score)
        ? a.composite_score
        : -1;
    const compB =
      typeof b.composite_score === "number" && Number.isFinite(b.composite_score)
        ? b.composite_score
        : -1;

    if (compB !== compA) return compB - compA;

    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""));
  });

  const topPerformers = sortedByRiskThenComposite.slice(0, 5).map((row) => {
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
  });

  const bottomPerformers = [...sortedByRiskThenComposite]
    .reverse()
    .slice(0, 5)
    .map((row) => {
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
    });

  const scopedParticipationSignal = buildScopedParticipationSignal({
    scopedRows: args.scopedRows,
    priorityKpis: scopedPriorityKpis.slice(0, 3),
    sourceSignal: args.source.participation_signal ?? null,
  });

  const scopedTopPriorityOverlay = args.source.top_priority_kpi_overlay
    ? {
        new_rows: filterOverlayRows(
          args.source.top_priority_kpi_overlay.new_rows,
          scopedTechIds
        ),
        persistent_rows: filterOverlayRows(
          args.source.top_priority_kpi_overlay.persistent_rows,
          scopedTechIds
        ),
        recovered_rows: filterOverlayRows(
          args.source.top_priority_kpi_overlay.recovered_rows,
          scopedTechIds
        ),
      }
    : null;

  const scopedPriorityKpiOverlays =
    args.source.priority_kpi_overlays?.map((overlay) => ({
      ...overlay,
      new_rows: filterOverlayRows(overlay.new_rows, scopedTechIds),
      persistent_rows: filterOverlayRows(overlay.persistent_rows, scopedTechIds),
      recovered_rows: filterOverlayRows(overlay.recovered_rows, scopedTechIds),
    })) ?? null;

  const scopedParticipationOverlay = args.source.participation_overlay
    ? {
        meets_3_rows: args.source.participation_overlay.meets_3_rows.filter((row) =>
          scopedTechIds.has(row.tech_id)
        ),
        meets_2_rows: args.source.participation_overlay.meets_2_rows.filter((row) =>
          scopedTechIds.has(row.tech_id)
        ),
        meets_1_rows: args.source.participation_overlay.meets_1_rows.filter((row) =>
          scopedTechIds.has(row.tech_id)
        ),
        meets_0_rows: args.source.participation_overlay.meets_0_rows.filter((row) =>
          scopedTechIds.has(row.tech_id)
        ),
      }
    : null;

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
    top_priority_kpi_overlay: scopedTopPriorityOverlay,
    priority_kpi_overlays: scopedPriorityKpiOverlays,
    participation_overlay: scopedParticipationOverlay,
    participation_signal: scopedParticipationSignal,
    participation: participationCounts,
    top_performers: topPerformers,
    bottom_performers: bottomPerformers,
  } satisfies MetricsRiskInsights;
}

export default function CompanyManagerScopedViewClient({ payload }: Props) {
  const [controls, setControls] = useState<MetricsControlsValue>({
    office_label: null,
    affiliation_type: null,
    contractor_name: null,
    reports_to_person_id: null,
    team_scope_mode: "DIRECT",
  });

  const allRows = useMemo(() => mapTeamRows(payload), [payload]);

  const officeOptions = useMemo(() => {
    return Array.from(
      new Set(allRows.map((row) => row.office_label).filter(Boolean))
    ).sort() as string[];
  }, [allRows]);

  const affiliationOptions = useMemo(() => {
    return Array.from(
      new Set(allRows.map((row) => row.affiliation_type).filter(Boolean))
    ).sort() as string[];
  }, [allRows]);

  const contractorOptions = useMemo(() => {
    return Array.from(
      new Set(
        allRows
          .map((row) => row.contractor_name)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();
  }, [allRows]);

  const supervisorOptions = useMemo<SupervisorOption[]>(() => {
    const byValue = new Map<string, string>();

    for (const row of allRows) {
      const value = String(row.reports_to_person_id ?? "").trim();
      if (!value) continue;

      const label = String(row.reports_to_label ?? "").trim() || value;

      if (!byValue.has(value)) {
        byValue.set(value, label);
      }
    }

    return [...byValue.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({
        value,
        label,
      }));
  }, [allRows]);

  const showOffice = officeOptions.length > 1;
  const showAffiliation = affiliationOptions.length > 1;
  const showContractor = contractorOptions.length > 1;
  const showSupervisor = supervisorOptions.length > 1;

  const { showTeamScope } = useScopedTeamControls(allRows, controls);

  const scopedRows = useMemo(() => {
    return buildScopedRows(allRows, controls);
  }, [allRows, controls]);

  const scopedExecutiveItems = useMemo(() => {
    return buildScopedExecutiveItems({
      sourceItems: payload.executive_kpis,
      scopedRows,
      allRows,
    });
  }, [payload.executive_kpis, scopedRows, allRows]);

  const scopedRiskInsights = useMemo(() => {
    return buildScopedRiskInsights({
      source: payload.risk_insights,
      scopedRows,
    });
  }, [payload.risk_insights, scopedRows]);

  const scopedWorkMix = useMemo(
    () => buildScopedWorkMix(scopedRows),
    [scopedRows]
  );

  const workMixContent = scopedWorkMix ? (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card px-3 py-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total Jobs
          </div>
          <div className="mt-1 text-2xl font-semibold">{scopedWorkMix.total}</div>
        </div>

        <div className="rounded-xl border bg-card px-3 py-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Installs
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {scopedWorkMix.installs}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatPercent(scopedWorkMix.install_pct)}
          </div>
        </div>

        <div className="rounded-xl border bg-card px-3 py-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            TCs
          </div>
          <div className="mt-1 text-2xl font-semibold">{scopedWorkMix.tcs}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatPercent(scopedWorkMix.tc_pct)}
          </div>
        </div>

        <div className="rounded-xl border bg-card px-3 py-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            SROs
          </div>
          <div className="mt-1 text-2xl font-semibold">{scopedWorkMix.sros}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatPercent(scopedWorkMix.sro_pct)}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="text-sm text-muted-foreground">No work mix available.</div>
  );

  return (
    <div className="space-y-4">
      <MetricsControlsStrip
        officeOptions={officeOptions}
        affiliationOptions={affiliationOptions}
        contractorOptions={contractorOptions}
        supervisorOptions={supervisorOptions}
        showOffice={showOffice}
        showAffiliation={showAffiliation}
        showContractor={showContractor}
        showSupervisor={showSupervisor}
        showTeamScope={showTeamScope}
        value={controls}
        onChange={setControls}
        onReset={() =>
          setControls({
            office_label: null,
            affiliation_type: null,
            contractor_name: null,
            reports_to_person_id: null,
            team_scope_mode: "DIRECT",
          })
        }
      />

      {payload.permissions.can_view_exec_strip ? (
        <MetricsExecutiveKpiStrip
          items={scopedExecutiveItems}
          subtitle="Scoped selection compared against total region fact set."
        />
      ) : null}

      {payload.permissions.can_view_risk_strip ? (
        <MetricsRiskStrip
          items={payload.risk_strip ?? []}
          insights={scopedRiskInsights ?? null}
        />
      ) : null}

      {payload.permissions.can_view_team_table ? (
        <MetricsTeamPerformanceTableClient
          columns={payload.team_table.columns.map((column) => ({
            kpi_key: column.kpi_key,
            label: column.label,
            report_order: column.report_order,
          }))}
          rows={scopedRows}
          workMixTitle="Work Mix"
          workMixContent={workMixContent}
        />
      ) : null}
    </div>
  );
}