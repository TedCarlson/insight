import { unstable_noStore as noStore } from "next/cache";

import { getCompanyManagerViewPayload } from "@/features/company-manager/lib/getCompanyManagerViewPayload.server";
import CompanyManagerPage from "@/features/company-manager/pages/CompanyManagerPage";

type Props = {
  searchParams: Promise<{
    range?: "FM" | "PREVIOUS" | "3FM" | "12FM";
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Route(props: Props) {
  noStore();

  const sp = await props.searchParams;
  const range = sp?.range ?? "FM";

  const payload = await getCompanyManagerViewPayload({ range });

  return <CompanyManagerPage payload={payload} />;
}