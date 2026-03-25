import type { CompanyManagerRosterRow } from "./companyManagerView.types";

type MetricSummary = {
  value: number | null;
  band: string | null;
};

type MetricOrderItem = {
  kpi_key: string;
  label: string;
};

export type LeadershipRollupRow = {
  leader_key: string;
  leader_name: string;
  leader_title: string | null;

  headcount: number;
  jobs: number;
  installs: number;
  tcs: number;
  sros: number;

  below_target_count: number;

  metrics: Map<string, MetricSummary>;
  metric_order: MetricOrderItem[];
};

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function buildMetricOrder(rows: CompanyManagerRosterRow[]): MetricOrderItem[] {
  const firstRow = rows[0];
  if (!firstRow) return [];

  return firstRow.metrics.map((metric) => ({
    kpi_key: metric.kpi_key,
    label: metric.label,
  }));
}

function buildMetricMap(
  rows: CompanyManagerRosterRow[],
  metricOrder: MetricOrderItem[]
) {
  const out = new Map<string, MetricSummary>();

  for (const col of metricOrder) {
    const values = rows.map((row) => {
      const metric = row.metrics.find((m) => m.kpi_key === col.kpi_key);
      return numOrNull(metric?.value);
    });

    const value = avg(values);

    const bandCounts: Record<string, number> = {};
    for (const row of rows) {
      const metric = row.metrics.find((m) => m.kpi_key === col.kpi_key);
      const band = metric?.band_key ?? null;
      if (!band) continue;
      bandCounts[band] = (bandCounts[band] ?? 0) + 1;
    }

    const band =
      Object.entries(bandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    out.set(col.kpi_key, { value, band });
  }

  return out;
}

export function buildLeadershipRollupRows(
  rows: CompanyManagerRosterRow[]
): LeadershipRollupRow[] {
  const grouped = new Map<string, CompanyManagerRosterRow[]>();

  for (const row of rows) {
    const leaderName =
      String((row as any).leader_name ?? "").trim() || "Unassigned";
    const leaderTitle =
      (row as any).leader_title == null
        ? null
        : String((row as any).leader_title).trim() || null;
    const leaderKey = `${leaderName}::${leaderTitle ?? ""}`;

    const arr = grouped.get(leaderKey) ?? [];
    arr.push(row);
    grouped.set(leaderKey, arr);
  }

  const leaderRows: LeadershipRollupRow[] = [];

  for (const [leaderKey, leaderGroupRows] of grouped.entries()) {
    let jobs = 0;
    let installs = 0;
    let tcs = 0;
    let sros = 0;
    let below_target_count = 0;

    for (const row of leaderGroupRows) {
      jobs += row.work_mix.total;
      installs += row.work_mix.installs;
      tcs += row.work_mix.tcs;
      sros += row.work_mix.sros;
      below_target_count += row.below_target_count;
    }

    const metric_order = buildMetricOrder(leaderGroupRows);
    const metrics = buildMetricMap(leaderGroupRows, metric_order);

    const sample = leaderGroupRows[0] as any;

    leaderRows.push({
      leader_key: leaderKey,
      leader_name: String(sample.leader_name ?? "").trim() || "Unassigned",
      leader_title:
        sample.leader_title == null
          ? null
          : String(sample.leader_title).trim() || null,
      headcount: leaderGroupRows.length,
      jobs,
      installs,
      tcs,
      sros,
      below_target_count,
      metrics,
      metric_order,
    });
  }

  return leaderRows.sort((a, b) =>
    a.leader_name.localeCompare(b.leader_name) ||
    String(a.leader_title ?? "").localeCompare(String(b.leader_title ?? ""))
  );
}