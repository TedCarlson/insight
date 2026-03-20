import BpViewClientShell from "./BpViewClientShell";
import { getBpViewPayload } from "../lib/getBpViewPayload.server";
import type { BpRangeKey } from "../lib/bpView.types";

function normalizeRange(value: string | null | undefined): BpRangeKey {
  if (value === "3FM") return "3FM";
  if (value === "12FM") return "12FM";
  return "FM";
}

export default async function BpViewPageShell(props: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const range = normalizeRange(searchParams?.range);

  const payload = await getBpViewPayload({ range });

  return <BpViewClientShell initialPayload={payload} />;
}