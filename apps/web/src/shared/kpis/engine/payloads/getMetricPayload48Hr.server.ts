import { getMetric48HrPayload } from "@/features/tech/metrics/lib/getMetric48HrPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayload48HrArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayload48Hr(
  args: GetMetricPayload48HrArgs
) {
  return getMetric48HrPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}