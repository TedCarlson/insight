// apps/web/src/app/(app)/route-lock/calendar/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

// IMPORTANT: use admin for reads (avoids RLS filtering facts to empty)
import { supabaseAdmin } from "@/shared/data/supabase/admin";

import { todayInNY } from "@/features/route-lock/calendar/lib/fiscalMonth";
import { getRouteLockDaysForFiscalMonth } from "@/features/route-lock/calendar/lib/getRouteLockDays.server";

import { RouteLockCalendarClient } from "@/features/route-lock/calendar/RouteLockCalendarClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { month?: string };
type Props = { searchParams?: Promise<SearchParams> };

type FiscalMonth = { fiscal_month_id: string; start_date: string; end_date: string; label: string | null };

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function resolveCurrentFiscalMonth(sb: any, anchorISO: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .lte("start_date", anchorISO)
    .gte("end_date", anchorISO)
    .maybeSingle();

  if (error || !data?.fiscal_month_id) return null;
  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date),
    end_date: String(data.end_date),
    label: (data.label as string | null) ?? null,
  };
}

async function resolveNextFiscalMonth(sb: any, currentEndISO: string): Promise<FiscalMonth | null> {
  const { data, error } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .gt("start_date", currentEndISO)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.fiscal_month_id) return null;
  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date),
    end_date: String(data.end_date),
    label: (data.label as string | null) ?? null,
  };
}

function MonthToggle({
  active,
  currentHref,
  nextHref,
  currentLabel,
  nextLabel,
}: {
  active: "current" | "next";
  currentHref: string;
  nextHref: string;
  currentLabel: string;
  nextLabel: string;
}) {
  return (
    <Card variant="subtle">
      <Toolbar
        left={
          <div className="min-w-0 flex items-center gap-2">
            <Link href="/route-lock" className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center">
              Back
            </Link>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Calendar</div>
              <div className="text-xs text-[var(--to-ink-muted)] truncate">
                Route Lock • Readiness view (planned/quota/validation/check-in)
              </div>
            </div>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Link
              href={currentHref}
              className={cls("to-btn h-8 px-3 text-xs", active === "current" ? "to-btn--primary" : "to-btn--secondary")}
            >
              Current • {currentLabel}
            </Link>
            <Link
              href={nextHref}
              className={cls("to-btn h-8 px-3 text-xs", active === "next" ? "to-btn--primary" : "to-btn--secondary")}
            >
              Next • {nextLabel}
            </Link>
          </div>
        }
      />
    </Card>
  );
}

export default async function RouteLockCalendarPage({ searchParams }: Props) {
  noStore();

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = supabaseAdmin(); // admin reads
  const pc_org_id = scope.selected_pc_org_id;

  const today = todayInNY();
  const fmCurrent = await resolveCurrentFiscalMonth(sb, today);
  if (!fmCurrent) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">Could not resolve current fiscal month (fiscal_month_dim).</div>
        </Card>
      </PageShell>
    );
  }

  const fmNext = await resolveNextFiscalMonth(sb, fmCurrent.end_date);
  if (!fmNext) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">Could not resolve next fiscal month (fiscal_month_dim).</div>
        </Card>
      </PageShell>
    );
  }

  const sp = (await searchParams) ?? {};
  const monthMode = String(sp?.month ?? "current") === "next" ? "next" : "current";
  const activeFm = monthMode === "next" ? fmNext : fmCurrent;

  const currentHref = "/route-lock/calendar?month=current";
  const nextHref = "/route-lock/calendar?month=next";

  const res = await getRouteLockDaysForFiscalMonth(sb, pc_org_id, activeFm.fiscal_month_id);

  if (!res.ok) {
    return (
      <PageShell>
        <MonthToggle
          active={monthMode}
          currentHref={currentHref}
          nextHref={nextHref}
          currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
          nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
        />
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{String(res.error ?? "Could not load route lock days.")}</div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <MonthToggle
        active={monthMode}
        currentHref={currentHref}
        nextHref={nextHref}
        currentLabel={String(fmCurrent.label ?? `${fmCurrent.start_date} → ${fmCurrent.end_date}`)}
        nextLabel={String(fmNext.label ?? `${fmNext.start_date} → ${fmNext.end_date}`)}
      />

      <RouteLockCalendarClient fiscal={res.fiscal} days={res.days} />
    </PageShell>
  );
}