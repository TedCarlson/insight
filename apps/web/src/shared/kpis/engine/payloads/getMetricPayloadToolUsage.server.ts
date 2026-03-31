import { getMetricToolUsagePayload } from "@/features/tech/metrics/lib/getMetricToolUsagePayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadToolUsageArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadToolUsage(
  args: GetMetricPayloadToolUsageArgs
) {
  return getMetricToolUsagePayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}