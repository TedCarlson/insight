import { unstable_noStore as noStore } from "next/cache";

import CompanySupervisorPageShell from "@/features/role-company-supervisor/pages/CompanySupervisorPageShell";

type ReportClassType = "P4P" | "SMART" | "TECH";

type Props = {
  searchParams: Promise<{
    range?: "FM" | "PREVIOUS" | "3FM" | "12FM";
    class_type?: ReportClassType;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Route(props: Props) {
  noStore();

  const sp = await props.searchParams;
  const range = sp?.range ?? "FM";
  const class_type = sp?.class_type ?? "TECH";

  return (
    <CompanySupervisorPageShell
      range={range}
      class_type={class_type}
    />
  );
}