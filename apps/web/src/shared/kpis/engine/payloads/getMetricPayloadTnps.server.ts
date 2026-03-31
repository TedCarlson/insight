import { getMetricTnpsPayload } from "@/features/tech/metrics/lib/getMetricTnpsPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadTnpsArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadTnps(
  args: GetMetricPayloadTnpsArgs
) {
  return getMetricTnpsPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}