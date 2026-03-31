import { buildMetricInspection } from "@/shared/kpis/engine/buildMetricInspection";
import { resolveMetricInspectionSourcePayload } from "@/shared/kpis/engine/resolveMetricInspectionSourcePayload.server";
import type {
  WorkforceInspectionFactRow,
  WorkforceInspectionPayload,
  WorkforceInspectionPeriodDetail,
  WorkforceInspectionSummaryRow,
  WorkforceInspectionSurface,
  WorkforceInspectionTarget,
  WorkforceInspectionTrendPoint,
} from "@/shared/kpis/contracts/inspectionTypes";
import type { KpiBandKey, MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetWorkforceMetricInspectionPayloadArgs = {
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

export async function getWorkforceMetricInspectionPayload(
  args: GetWorkforceMetricInspectionPayloadArgs
): Promise<WorkforceInspectionPayload> {
  const sourcePayload = await resolveMetricInspectionSourcePayload({
    kpi_key: args.kpi_key,
    active_range: args.active_range,
    target: args.target,
    payload: args.payload,
  });

  return buildMetricInspection({
    surface: args.surface,
    active_range: args.active_range,
    kpi_key: args.kpi_key,
    target: args.target,

    title: args.title ?? null,
    value: args.value ?? null,
    value_display: args.value_display ?? null,
    band_key: args.band_key ?? null,
    band_label: args.band_label ?? null,
    accent_color: args.accent_color ?? null,

    summary_rows: args.summary_rows ?? [],
    trend_points: args.trend_points ?? [],
    period_detail: args.period_detail ?? null,
    fact_rows: args.fact_rows ?? [],

    payload: sourcePayload,
  });
}