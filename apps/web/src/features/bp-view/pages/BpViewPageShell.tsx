import { unstable_noStore as noStore } from "next/cache";

import type { BpRangeKey } from "../lib/bpView.types";
import { getBpViewPayload } from "../lib/getBpViewPayload.server";
import BpViewClientShell from "./BpViewClientShell";

function normalizeRange(value: string | null | undefined): BpRangeKey {
  const upper = String(value ?? "FM").toUpperCase();
  if (upper === "PREVIOUS") return "PREVIOUS";
  if (upper === "3FM") return "3FM";
  if (upper === "12FM") return "12FM";
  return "FM";
}

export default async function BpViewPageShell(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const resolvedSearchParams = props.searchParams
    ? await props.searchParams
    : undefined;

  const rawRange = Array.isArray(resolvedSearchParams?.range)
    ? resolvedSearchParams.range[0]
    : resolvedSearchParams?.range;

  const range = normalizeRange(rawRange);
  const payload = await getBpViewPayload({ range });

  return <BpViewClientShell payload={payload} initialRange={range} />;
}