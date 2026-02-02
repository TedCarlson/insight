// apps/web/src/app/route-lock/routes/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import RoutesAdminClient from "./RoutesAdminClient";

export default async function RouteLockRoutesPage() {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  return (
    <PageShell>
      <Card variant="subtle">
        <Toolbar
          left={
            <div className="min-w-0 flex items-center gap-2">
              <Link href="/route-lock" className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center">
                Back
              </Link>

              <span className="px-2 text-[var(--to-ink-muted)]">•</span>

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5">Routes</div>
                <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
                  Route Lock • Manage routes for the selected PC org
                </div>
              </div>
            </div>
          }
          right={null}
        />
      </Card>

      <Card>
        <RoutesAdminClient />
      </Card>
    </PageShell>
  );
}