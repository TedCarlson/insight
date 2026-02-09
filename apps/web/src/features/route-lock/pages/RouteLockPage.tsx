// apps/web/src/features/route-lock/pages/RouteLockPage.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/shared/data/supabase/server";

import { todayInNY } from "@/features/route-lock/calendar/lib/fiscalMonth";
import { getRouteLockDaysForCurrentFiscalMonth } from "@/features/route-lock/calendar/lib/getRouteLockDays.server";
import { RouteLockSevenDayClient } from "@/features/route-lock/landing/RouteLockSevenDayClient";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SectionCard({ title, href }: { title: string; href: string }) {
  return (
    <Card>
      <Link href={href} className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "w-full", "text-center")}>
        {title}
      </Link>
    </Card>
  );
}

export default async function RouteLockPage() {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  const res = await getRouteLockDaysForCurrentFiscalMonth(sb, pc_org_id);

  const today = todayInNY();
  const next7 = res.ok ? res.days.filter((d) => d.date >= today).slice(0, 7) : [];

  return (
    <PageShell>
      <PageHeader title="Route Lock" subtitle="Configure schedule, quotas, routes, and validation." />

      {/* Tightened to 3 per row on large screens */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Schedule" href="/route-lock/schedule" />
        <SectionCard title="Quota" href="/route-lock/quota" />
        <SectionCard title="Routes" href="/route-lock/routes" />
        <SectionCard title="Shift Validation" href="/route-lock/shift-validation" />
        <SectionCard title="Calendar" href="/route-lock/calendar" />
      </div>

      {/* Rolling 7-day readiness detail + 7-day summary totals */}
      <RouteLockSevenDayClient days={next7} />
    </PageShell>
  );
}