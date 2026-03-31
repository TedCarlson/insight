import { getMetricMetPayload } from "@/features/tech/metrics/lib/getMetricMetPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadMetArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadMet(
  args: GetMetricPayloadMetArgs
) {
  return getMetricMetPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}