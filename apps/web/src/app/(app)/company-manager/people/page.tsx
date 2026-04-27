// path: apps/web/src/app/(app)/company-manager/people/page.tsx

import { PeopleStagingClient } from "@/shared/surfaces/people/PeopleStagingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CompanyManagerPeoplePage() {
  return (
    <main className="p-6">
      <PeopleStagingClient />
    </main>
  );
}