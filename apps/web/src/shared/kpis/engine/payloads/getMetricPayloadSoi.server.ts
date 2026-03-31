import { getMetricSoiPayload } from "@/features/tech/metrics/lib/getMetricSoiPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadSoiArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadSoi(
  args: GetMetricPayloadSoiArgs
) {
  return getMetricSoiPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}