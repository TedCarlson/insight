import type { CompanyManagerRosterRow } from "./companyManagerView.types";

type MetricSummary = {
  value: number | null;
  band: string | null;
};

type MetricOrderItem = {
  kpi_key: string;
  label: string;
};

export type OfficeRollupRow = {
  office: string;

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

export function buildOfficeRollupRows(
  rows: CompanyManagerRosterRow[]
): OfficeRollupRow[] {
  const grouped = new Map<string, CompanyManagerRosterRow[]>();

  for (const row of rows) {
    const office =
      String((row as any).office_name ?? "").trim() ||
      String(row.context ?? "").trim() ||
      "Unknown";

    const arr = grouped.get(office) ?? [];
    arr.push(row);
    grouped.set(office, arr);
  }

  const officeRows: OfficeRollupRow[] = [];

  for (const [office, officeGroupRows] of grouped.entries()) {
    let jobs = 0;
    let installs = 0;
    let tcs = 0;
    let sros = 0;
    let below_target_count = 0;

    for (const row of officeGroupRows) {
      jobs += row.work_mix.total;
      installs += row.work_mix.installs;
      tcs += row.work_mix.tcs;
      sros += row.work_mix.sros;
      below_target_count += row.below_target_count;
    }

    const metric_order = buildMetricOrder(officeGroupRows);
    const metrics = buildMetricMap(officeGroupRows, metric_order);

    officeRows.push({
      office,
      headcount: officeGroupRows.length,
      jobs,
      installs,
      tcs,
      sros,
      below_target_count,
      metrics,
      metric_order,
    });
  }

  return officeRows.sort((a, b) => a.office.localeCompare(b.office));
}