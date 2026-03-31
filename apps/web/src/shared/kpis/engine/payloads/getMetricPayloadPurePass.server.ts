import { getMetricPurePassPayload } from "@/features/tech/metrics/lib/getMetricPurePassPayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";

export type GetMetricPayloadPurePassArgs = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

export async function getMetricPayloadPurePass(
  args: GetMetricPayloadPurePassArgs
) {
  return getMetricPurePassPayload({
    person_id: args.person_id,
    tech_id: args.tech_id,
    range: args.range,
  });
}