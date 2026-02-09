import { redirect } from "next/navigation";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/shared/data/supabase/server";

import { RouteLockBackHeader } from "@/features/route-lock/components/RouteLockBackHeader";
import { RouteLockCalendarClient } from "@/features/route-lock/calendar/RouteLockCalendarClient";
import { getRouteLockDaysForCurrentFiscalMonth } from "@/features/route-lock/calendar/lib/getRouteLockDays.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RouteLockCalendarPage() {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  const res = await getRouteLockDaysForCurrentFiscalMonth(sb, pc_org_id);

  if (!res.ok) {
    return (
      <PageShell>
        <RouteLockBackHeader title="Calendar" subtitle="Route Lock • Fiscal-month readiness" />
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{res.error}</div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <RouteLockBackHeader title="Calendar" subtitle={`Route Lock • ${res.fiscal.label ?? "Fiscal month"}`} />
      <RouteLockCalendarClient fiscal={res.fiscal} days={res.days} />
    </PageShell>
  );
}