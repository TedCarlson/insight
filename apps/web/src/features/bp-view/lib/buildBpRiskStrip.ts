import type { BpViewRiskItem, BpViewRosterRow } from "./bpView.types";

type KpiCfg = {
  kpi_key: string;
  label: string;
  sort: number;
};

function hasPositiveJobs(row: BpViewRosterRow) {
  return (row.work_mix?.total ?? 0) > 0;
}

export function buildBpRiskStrip(args: {
  rosterRows: BpViewRosterRow[];
  kpis: KpiCfg[];
}): BpViewRiskItem[] {
  const eligibleRows = args.rosterRows.filter(hasPositiveJobs);

  const belowThresholdCount = eligibleRows.filter(
    (r) => r.below_target_count >= 2
  ).length;

  const kpiConcernCounts = new Map<string, number>();
  for (const kpi of args.kpis) kpiConcernCounts.set(kpi.kpi_key, 0);

  for (const row of eligibleRows) {
    for (const metric of row.metrics) {
      if (
        metric.band_key === "NEEDS_IMPROVEMENT" ||
        metric.band_key === "MISSES"
      ) {
        kpiConcernCounts.set(
          metric.kpi_key,
          (kpiConcernCounts.get(metric.kpi_key) ?? 0) + 1
        );
      }
    }
  }

  const topConcern = [...kpiConcernCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];

  const topConcernLabel =
    args.kpis.find((k) => k.kpi_key === topConcern?.[0])?.label ?? "—";
  const topConcernCount = topConcern?.[1] ?? 0;

  const coachingQueue = eligibleRows.filter(
    (r) => r.below_target_count >= 1
  ).length;

  const strongestTech =
    [...eligibleRows].sort(
      (a, b) =>
        a.below_target_count - b.below_target_count ||
        b.work_mix.total - a.work_mix.total ||
        a.full_name.localeCompare(b.full_name)
    )[0]?.full_name ?? "—";

  return [
    {
      title: "Below Threshold",
      value: String(belowThresholdCount),
      note: "Techs below target on 2+ KPIs",
    },
    {
      title: "Coaching Queue",
      value: String(coachingQueue),
      note: "Techs with at least 1 KPI needing attention",
    },
    {
      title: "Top Concern",
      value: topConcernLabel,
      note: `${topConcernCount} KPI flags in scope`,
    },
    {
      title: "Strongest Standing",
      value: strongestTech,
      note: "Lowest current risk footprint",
    },
  ];
}