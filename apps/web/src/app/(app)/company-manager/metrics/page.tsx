// path: apps/web/src/app/(app)/company-manager/metrics/page.tsx

import CompanyManagerMetricsPageShell from "@/features/role-company-manager/pages/CompanyManagerMetricsPageShell";

type PageProps = {
  searchParams?: Promise<{
    range?: string;
    class_type?: string;
  }>;
};

function normalizeClassType(value: string | undefined): "NSR" | "SMART" {
  return String(value ?? "NSR").trim().toUpperCase() === "SMART"
    ? "SMART"
    : "NSR";
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;

  const class_type = normalizeClassType(searchParams?.class_type);
  const range = searchParams?.range;

  return (
    <CompanyManagerMetricsPageShell
      class_type={class_type}
      range={range}
    />
  );
}