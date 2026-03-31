import { getMetricRepeatPayload } from "@/features/tech/metrics/lib/getMetricRepeatPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadRepeatArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadRepeat(
  args: GetMetricPayloadRepeatArgs
) {
  return getMetricRepeatPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}