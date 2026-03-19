import BpViewClientShell from "./BpViewClientShell";
import { getBpViewPayload } from "../lib/getBpViewPayload.server";

export default async function BpViewPageShell() {
  const payload = await getBpViewPayload({ range: "FM" });

  return <BpViewClientShell initialPayload={payload} />;
}