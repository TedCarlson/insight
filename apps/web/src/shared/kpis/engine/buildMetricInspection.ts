import type {
  WorkforceInspectionFactRow,
  WorkforceInspectionPayload,
  WorkforceInspectionPeriodDetail,
  WorkforceInspectionSummaryRow,
  WorkforceInspectionSurface,
  WorkforceInspectionTarget,
  WorkforceInspectionTrendPoint,
} from "@/shared/kpis/contracts/inspectionTypes";
import { resolveInspectionMetricFamily } from "@/shared/kpis/definitions/resolveInspectionMetricFamily";
import { buildMetricInspectionModel } from "@/shared/kpis/engine/metricInspectionRegistry";
import type { KpiBandKey, MetricsRangeKey } from "@/shared/kpis/core/types";

export type BuildMetricInspectionArgs = {
  surface: WorkforceInspectionSurface;
  active_range: MetricsRangeKey;
  kpi_key: string;
  target: WorkforceInspectionTarget;

  title?: string | null;
  value?: number | null;
  value_display?: string | null;
  band_key?: KpiBandKey | null;
  band_label?: string | null;
  accent_color?: string | null;

  summary_rows?: WorkforceInspectionSummaryRow[] | null;
  trend_points?: WorkforceInspectionTrendPoint[] | null;
  period_detail?: WorkforceInspectionPeriodDetail | null;
  fact_rows?: WorkforceInspectionFactRow[] | null;

  payload?: unknown;
};

function toHeadlineTitle(kpiKey: string, explicitTitle?: string | null): string {
  if (explicitTitle && explicitTitle.trim()) return explicitTitle.trim();

  return String(kpiKey)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toBandLabel(bandKey: KpiBandKey): string {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function buildGenericMetricInspection(
  args: BuildMetricInspectionArgs
): WorkforceInspectionPayload {
  const bandKey = args.band_key ?? "NO_DATA";
  const metricFamily = resolveInspectionMetricFamily(args.kpi_key);

  const base: WorkforceInspectionPayload = {
    surface: args.surface,
    active_range: args.active_range,
    kpi_key: args.kpi_key,
    metric_family: metricFamily,

    target: args.target,

    title: toHeadlineTitle(args.kpi_key, args.title),
    value: args.value ?? null,
    value_display: args.value_display ?? null,
    band_key: bandKey,
    band_label: args.band_label?.trim() || toBandLabel(bandKey),
    accent_color: args.accent_color ?? null,

    summary_rows: args.summary_rows ?? [],
    trend_points: args.trend_points ?? [],
    period_detail: args.period_detail ?? null,
    fact_rows: args.fact_rows ?? [],

    drawer_model: null,
    render_model: null,
  };

  return Object.assign(base, {
    payload: args.payload ?? null,
  }) as WorkforceInspectionPayload;
}

export function buildMetricInspection(
  args: BuildMetricInspectionArgs
): WorkforceInspectionPayload {
  const metricFamily = resolveInspectionMetricFamily(args.kpi_key);
  const bandKey = args.band_key ?? "NO_DATA";

  const render_model = args.payload
    ? buildMetricInspectionModel({
        kpi_key: args.kpi_key,
        active_range: args.active_range,
        payload: args.payload,
      })
    : null;

  const base = buildGenericMetricInspection(args);

  return Object.assign(base, {
    metric_family: metricFamily,
    band_key: bandKey,
    band_label: args.band_label?.trim() || toBandLabel(bandKey),
    render_model,
    payload: args.payload ?? null,
  }) as WorkforceInspectionPayload;
}