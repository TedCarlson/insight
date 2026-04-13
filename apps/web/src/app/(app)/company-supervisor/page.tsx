// path: apps/web/src/app/(app)/company-supervisor/page.tsx

import CompanySupervisorPageShell from "@/features/role-company-supervisor/pages/CompanySupervisorPageShell";

type ReportClassType = "NSR" | "SMART";

export default async function Page(props: {
  searchParams?: Promise<{ class_type?: string; range?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const rawClass = String(searchParams.class_type ?? "NSR").toUpperCase();

  const class_type: ReportClassType =
    rawClass === "SMART" ? "SMART" : "NSR";

  return (
    <CompanySupervisorPageShell
      class_type={class_type}
      range={searchParams.range}
    />
  );
}