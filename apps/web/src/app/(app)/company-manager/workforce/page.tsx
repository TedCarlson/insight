// path: apps/web/src/app/(app)/company-manager/workforce/page.tsx

import CompanyManagerWorkforcePageShell from "@/features/role-company-manager/pages/CompanyManagerWorkforcePageShell";

type PageProps = {
  searchParams?: Promise<{
    selected_person_id?: string;
    search?: string;
    reports_to_person_id?: string;
    status?: "ACTIVE" | "INACTIVE" | "ALL";
    as_of_date?: string;
  }>;
};

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;

  return (
    <CompanyManagerWorkforcePageShell
      selected_person_id={searchParams?.selected_person_id}
      search={searchParams?.search}
      reports_to_person_id={searchParams?.reports_to_person_id}
      status={searchParams?.status}
      as_of_date={searchParams?.as_of_date}
    />
  );
}