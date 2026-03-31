import { getMetricReworkPayload } from "@/features/tech/metrics/lib/getMetricReworkPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadReworkArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadRework(
  args: GetMetricPayloadReworkArgs
) {
  return getMetricReworkPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}