import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { todayInNY } from "@/features/route-lock/calendar/lib/fiscalMonth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { month?: string };
type Props = { searchParams?: Promise<SearchParams> };

type FiscalMonth = {
  fiscal_month_id: string;
  start_date: string;
  end_date: string;
  label: string | null;
};

type AccessPass = {
  person_id: string | null;
};

function weekdayShort(idx: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]!;
}

function dayNum(iso: string) {
  return Number(iso.slice(8, 10));
}

function monthTitle(startIso: string) {
  const d = new Date(`${startIso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildCalendarCells(startIso: string, endIso: string, scheduled: Set<string>) {
  const first = new Date(`${startIso}T00:00:00Z`);
  const pad = first.getUTCDay();

  const cells: Array<{ date: string | null; scheduled: boolean }> = [];
  for (let i = 0; i < pad; i += 1) cells.push({ date: null, scheduled: false });

  let cur = startIso;
  while (cur <= endIso) {
    cells.push({ date: cur, scheduled: scheduled.has(cur) });
    cur = addDaysIso(cur, 1);
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, scheduled: false });
  }

  return cells;
}

async function resolveCurrentFiscalMonth(sb: any, anchorIso: string): Promise<FiscalMonth | null> {
  const { data } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .lte("start_date", anchorIso)
    .gte("end_date", anchorIso)
    .maybeSingle();

  if (!data?.fiscal_month_id) return null;

  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date).slice(0, 10),
    end_date: String(data.end_date).slice(0, 10),
    label: (data.label as string | null) ?? null,
  };
}

async function resolvePrevFiscalMonth(sb: any, currentStartIso: string): Promise<FiscalMonth | null> {
  const { data } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .lt("end_date", currentStartIso)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.fiscal_month_id) return null;

  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date).slice(0, 10),
    end_date: String(data.end_date).slice(0, 10),
    label: (data.label as string | null) ?? null,
  };
}

async function resolveNextFiscalMonth(sb: any, currentEndIso: string): Promise<FiscalMonth | null> {
  const { data } = await sb
    .from("fiscal_month_dim")
    .select("fiscal_month_id,start_date,end_date,label")
    .gt("start_date", currentEndIso)
    .order("start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.fiscal_month_id) return null;

  return {
    fiscal_month_id: String(data.fiscal_month_id),
    start_date: String(data.start_date).slice(0, 10),
    end_date: String(data.end_date).slice(0, 10),
    label: (data.label as string | null) ?? null,
  };
}

export default async function TechSchedulePage({ searchParams }: Props) {
  noStore();

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const admin = supabaseAdmin();
  const pc_org_id = scope.selected_pc_org_id;
  const today = todayInNY();

  const { data: passData } = await sb.rpc("get_access_pass", { p_pc_org_id: pc_org_id });
  const pass = (passData ?? null) as AccessPass | null;
  const person_id = String(pass?.person_id ?? "").trim() || null;

  const fmCurrent = await resolveCurrentFiscalMonth(admin, today);

  if (!fmCurrent) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">Could not resolve fiscal month.</div>
        </Card>
      </PageShell>
    );
  }

  const fmPrev = await resolvePrevFiscalMonth(admin, fmCurrent.start_date);
  const fmNext = await resolveNextFiscalMonth(admin, fmCurrent.end_date);

  const sp = (await searchParams) ?? {};
  const rawMonth = String(sp.month ?? "current");
  const monthMode: "prev" | "current" | "next" =
    rawMonth === "prev" ? "prev" : rawMonth === "next" ? "next" : "current";

  const activeFm =
    monthMode === "prev" ? (fmPrev ?? fmCurrent) : monthMode === "next" ? (fmNext ?? fmCurrent) : fmCurrent;

  if (!person_id) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm font-semibold">Schedule</div>
          <div className="mt-2 text-sm text-[var(--to-ink-muted)]">No person is linked to this signed-in user yet.</div>
        </Card>
      </PageShell>
    );
  }

  const { data: assignmentRows, error: assignmentErr } = await admin
    .from("assignment")
    .select("assignment_id,active,start_date,end_date")
    .eq("pc_org_id", pc_org_id)
    .eq("person_id", person_id)
    .order("start_date", { ascending: false })
    .limit(10);

  if (assignmentErr) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{assignmentErr.message}</div>
        </Card>
      </PageShell>
    );
  }

  const activeAssignment =
    (assignmentRows ?? []).find((row: any) => {
      const activeOk = row.active === true || row.active == null;
      const startOk = !row.start_date || String(row.start_date).slice(0, 10) <= today;
      const endOk = !row.end_date || String(row.end_date).slice(0, 10) >= today;
      return activeOk && startOk && endOk;
    }) ??
    (assignmentRows ?? [])[0] ??
    null;

  const assignment_id = String((activeAssignment as any)?.assignment_id ?? "").trim() || null;

  if (!assignment_id) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm font-semibold">Schedule</div>
          <div className="mt-2 text-sm text-[var(--to-ink-muted)]">No active assignment was found for this tech.</div>
        </Card>
      </PageShell>
    );
  }

  const { data: scheduleRows, error: scheduleErr } = await admin
    .from("schedule_day_fact")
    .select("shift_date")
    .eq("pc_org_id", pc_org_id)
    .eq("person_id", person_id)
    .eq("assignment_id", assignment_id)
    .gte("shift_date", activeFm.start_date)
    .lte("shift_date", activeFm.end_date)
    .order("shift_date", { ascending: true });

  if (scheduleErr) {
    return (
      <PageShell>
        <Card>
          <div className="text-sm text-[var(--to-warning)]">{scheduleErr.message}</div>
        </Card>
      </PageShell>
    );
  }

  const scheduled = new Set(
    (scheduleRows ?? []).map((row: any) => String(row.shift_date ?? "").slice(0, 10)).filter(Boolean)
  );

  const cells = buildCalendarCells(activeFm.start_date, activeFm.end_date, scheduled);
  const title = monthTitle(activeFm.start_date);

  return (
    <PageShell>
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <Link href="/tech/schedule?month=prev" className="to-btn to-btn--secondary h-8 px-3 text-xs">
              Prev
            </Link>
            <div className="text-center">
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-[11px] text-[var(--to-ink-muted)]">Green = Scheduled • Amber = Off</div>
            </div>
            <Link href="/tech/schedule?month=next" className="to-btn to-btn--secondary h-8 px-3 text-xs">
              Next
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={weekdayShort(idx)} className="text-center text-[11px] font-medium text-[var(--to-ink-muted)]">
                {weekdayShort(idx)}
              </div>
            ))}

            {cells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`blank-${idx}`} className="aspect-square rounded-xl border border-transparent" />;
              }

              const isToday = cell.date === today;
              const paintStyle = cell.scheduled
                ? {
                    borderColor: "color-mix(in oklab, var(--to-success) 55%, var(--to-border))",
                    backgroundColor: "color-mix(in oklab, var(--to-success) 16%, var(--to-surface))",
                  }
                : {
                    borderColor: "color-mix(in oklab, var(--to-warning) 55%, var(--to-border))",
                    backgroundColor: "color-mix(in oklab, var(--to-warning) 16%, var(--to-surface))",
                  };

              return (
                <div
                  key={cell.date}
                  className={`aspect-square rounded-xl border p-2 ${isToday ? "ring-2 ring-[var(--to-accent)] ring-offset-0" : ""}`}
                  style={paintStyle}
                  title={`${cell.date} • ${cell.scheduled ? "Scheduled" : "Off"}`}
                >
                  <div className="flex h-full items-start justify-end">
                    <span className="text-sm font-semibold">{dayNum(cell.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}