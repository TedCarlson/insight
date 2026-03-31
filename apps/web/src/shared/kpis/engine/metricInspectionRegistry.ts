import { resolveInspectionMetricFamily } from "@/shared/kpis/definitions/resolveInspectionMetricFamily";
import { buildInspectionTnps } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionTnps";
import { buildInspectionFtr } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionFtr";
import { buildInspectionToolUsage } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionToolUsage";
import { buildInspectionPurePass } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionPurePass";
import { buildInspection48Hr } from "@/shared/kpis/engine/inspectionBuilders/buildInspection48Hr";
import { buildInspectionRepeat } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionRepeat";
import { buildInspectionSoi } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionSoi";
import { buildInspectionRework } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionRework";
import { buildInspectionMet } from "@/shared/kpis/engine/inspectionBuilders/buildInspectionMet";
import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type MetricInspectionRegistryArgs = {
  kpi_key: string;
  active_range: MetricsRangeKey;
  payload: unknown;
};

export type MetricInspectionBuilder = (
  args: MetricInspectionRegistryArgs
) => InspectionRenderModel | null;

function buildUnknownInspection(): InspectionRenderModel | null {
  return null;
}

export const metricInspectionRegistry: Record<string, MetricInspectionBuilder> = {
  tnps: ({ active_range, payload }) =>
    buildInspectionTnps({
      activeRange: active_range,
      payload,
    }),
  ftr: ({ active_range, payload }) =>
    buildInspectionFtr({
      activeRange: active_range,
      payload,
    }),
  tool_usage: ({ active_range, payload }) =>
    buildInspectionToolUsage({
      activeRange: active_range,
      payload,
    }),
  pure_pass: ({ active_range, payload }) =>
    buildInspectionPurePass({
      activeRange: active_range,
      payload,
    }),
  contact_48hr: ({ active_range, payload }) =>
    buildInspection48Hr({
      activeRange: active_range,
      payload,
    }),
  repeat: ({ active_range, payload }) =>
    buildInspectionRepeat({
      activeRange: active_range,
      payload,
    }),
  soi: ({ active_range, payload }) =>
    buildInspectionSoi({
      activeRange: active_range,
      payload,
    }),
  rework: ({ active_range, payload }) =>
    buildInspectionRework({
      activeRange: active_range,
      payload,
    }),
  met_rate: ({ active_range, payload }) =>
    buildInspectionMet({
      activeRange: active_range,
      payload,
    }),
};

export function buildMetricInspectionModel(
  args: MetricInspectionRegistryArgs
): InspectionRenderModel | null {
  const family = resolveInspectionMetricFamily(args.kpi_key);
  const builder = metricInspectionRegistry[family] ?? buildUnknownInspection;
  return builder(args);
}