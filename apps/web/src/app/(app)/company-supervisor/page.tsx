import { unstable_noStore as noStore } from "next/cache";

import { getCompanySupervisorViewPayload } from "@/features/company-supervisor-view/lib/getCompanySupervisorViewPayload.server";
import CompanySupervisorPage from "@/features/company-supervisor-view/pages/CompanySupervisorPage";

type Props = {
  searchParams: Promise<{
    range?: "FM" | "3FM" | "12FM";
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Route(props: Props) {
  noStore();

  const sp = await props.searchParams;
  const range = sp?.range ?? "FM";

  const payload = await getCompanySupervisorViewPayload({ range });

  return <CompanySupervisorPage payload={payload} />;
}