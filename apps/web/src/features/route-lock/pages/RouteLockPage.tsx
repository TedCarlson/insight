// apps/web/src/features/route-lock/pages/RouteLockPage.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

// IMPORTANT: use admin for reads (avoids RLS filtering facts to empty)
import { supabaseAdmin } from "@/shared/data/supabase/admin";

import { todayInNY } from "@/features/route-lock/calendar/lib/fiscalMonth";
import { getRouteLockDaysForCurrentFiscalMonth } from "@/features/route-lock/calendar/lib/getRouteLockDays.server";
import { RouteLockSevenDayClient } from "@/features/route-lock/landing/RouteLockSevenDayClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  noStore();

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = supabaseAdmin(); // admin reads
  const pc_org_id = scope.selected_pc_org_id;

  const res = await getRouteLockDaysForCurrentFiscalMonth(sb, pc_org_id);

  const today = todayInNY();
  const next7 = res.ok ? res.days.filter((d) => d.date >= today).slice(0, 7) : [];

  return (
    <PageShell>
      <PageHeader title="Route Lock" subtitle="Configure schedule, quotas, routes, shift-validation, and check-in." />

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-6">
        <SectionCard title="Lock Calendar" href="/route-lock/calendar" />
        <SectionCard title="Baseline Schedule" href="/route-lock/schedule" />
        <SectionCard title="Shift Validations" href="/route-lock/shift-validation" />
        <SectionCard title="Check-In Uploads" href="/route-lock/check-in" />
        <SectionCard title="Manage Quota" href="/route-lock/quota" />
        <SectionCard title="Manage Routes" href="/route-lock/routes" />
      </div>

      <RouteLockSevenDayClient days={next7} />
    </PageShell>
  );
}