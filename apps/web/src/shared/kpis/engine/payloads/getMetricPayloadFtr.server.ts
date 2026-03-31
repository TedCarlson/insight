import { getMetricFtrPayload } from "@/features/tech/metrics/lib/getMetricFtrPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadFtrArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadFtr(
  args: GetMetricPayloadFtrArgs
) {
  return getMetricFtrPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}