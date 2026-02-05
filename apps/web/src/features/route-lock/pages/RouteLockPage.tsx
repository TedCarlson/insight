// apps/web/src/app/route-lock/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SectionCard({ title, href }: { title: string; href: string }) {
  return (
    <Card>
      <Link
        href={href}
        className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "w-full", "text-center")}
      >
        {title}
      </Link>
    </Card>
  );
}

function dayCode(s: any) {
  const d = [
    s?.sun ? "Su" : "",
    s?.mon ? "M" : "",
    s?.tue ? "Tu" : "",
    s?.wed ? "W" : "",
    s?.thu ? "Th" : "",
    s?.fri ? "F" : "",
    s?.sat ? "Sa" : "",
  ].filter(Boolean);
  return d.length ? d.join(" ") : "—";
}

function sumHours(s: any) {
  const keys = [
    "sch_hours_sun",
    "sch_hours_mon",
    "sch_hours_tue",
    "sch_hours_wed",
    "sch_hours_thu",
    "sch_hours_fri",
    "sch_hours_sat",
  ];
  return keys.reduce((acc, k) => acc + Number(s?.[k] ?? 0), 0);
}

export default async function RouteLockPage() {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const pc_org_id = scope.selected_pc_org_id;
  const today = new Date().toISOString().slice(0, 10);

  const admin = supabaseAdmin();

  // Baseline schedule evidence: pull recent schedule rows for this org (service role)
  const { data: scheduleRows, error: scheduleErr } = await admin
  .from("schedule_admin_v")
  .select(
    [
      "schedule_id",
      "assignment_id",
      "full_name",
      "start_date",
      "end_date",
      "default_route_id",
      "sun","mon","tue","wed","thu","fri","sat",
      "sch_hours_sun","sch_hours_mon","sch_hours_tue","sch_hours_wed","sch_hours_thu","sch_hours_fri","sch_hours_sat",
      "pc_org_name",
    ].join(",")
  )
  .eq("pc_org_id", pc_org_id)
  .is("end_date", null)              // ✅ ONLY OPEN BASELINE ROWS
  .order("start_date", { ascending: false })
  .limit(1000);

  // Org label should come from the org selection, not from schedule rows.
  // We display the numeric PC value (e.g., 427) even when there are no schedule rows.
  let orgLabel = String(pc_org_id);

  const { data: orgRow, error: orgErr } = await admin
    .from("pc_org")
    .select("pc_id")
    .eq("pc_org_id", pc_org_id)
    .maybeSingle();

  if (!orgErr && orgRow?.pc_id) {
  const { data: pcRow, error: pcErr } = await admin
    .from("pc")
    .select("pc_number")
    .eq("pc_id", orgRow.pc_id)
    .maybeSingle();

  if (!pcErr && pcRow?.pc_number != null) {
    orgLabel = String(pcRow.pc_number);
  }
}

  // Build "latest snapshot per assignment"
  // Because results are ordered start_date DESC, the first row we see per assignment is the latest.
  const latestByAssignment = new Map<string, any>();
  const all = scheduleRows ?? [];
  for (const s of all) {
    const aid = String((s as any).assignment_id ?? "").trim();
    if (!aid || latestByAssignment.has(aid)) continue;
    latestByAssignment.set(aid, s);
  }

  const latest = Array.from(latestByAssignment.values());

  // Current baseline = latest rows where end_date is NULL or in the future
  const currentBaseline = latest.filter((s: any) => {
    const end = String(s?.end_date ?? "").trim();
    return !end || end >= today;
  });

  const missingDefaultRoute = currentBaseline.filter(
    (s: any) => !String(s.default_route_id ?? "").trim()
  ).length;

  const missingAnyDay = currentBaseline.filter(
    (s: any) => !(s.sun || s.mon || s.tue || s.wed || s.thu || s.fri || s.sat)
  ).length;

  // Show top 15 rows from the latest snapshot as evidence (even if currentBaseline is 0)
  const sample = latest.slice(0, 15);

  return (
    <PageShell>
      <PageHeader title="Route Lock" subtitle="Configure schedule, quotas, routes, and validation." />

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Schedule" href="/route-lock/schedule" />
        <SectionCard title="Quota" href="/route-lock/quota" />
        <SectionCard title="Routes" href="/route-lock/routes" />
        <SectionCard title="Shift Validation" href="/route-lock/shift-validation" />
      </div>

      <Card>
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Baseline schedule evidence</div>

          {scheduleErr ? (
            <div className="text-sm text-[var(--to-warning)]">
              Could not load schedule baseline (schedule_admin_v): {scheduleErr.message}
            </div>
          ) : (
            <>
              <div className="text-sm text-[var(--to-ink-muted)]">
                Org: <span className="font-medium text-[var(--to-ink)]">{orgLabel}</span>
                {" • "}
                Latest snapshot rows:{" "}
                <span className="font-medium text-[var(--to-ink)]">{latest.length}</span>
                {" • "}
                Current baseline rows:{" "}
                <span className="font-medium text-[var(--to-ink)]">{currentBaseline.length}</span>
                {" • "}
                Missing default route:{" "}
                <span className="font-medium text-[var(--to-ink)]">{missingDefaultRoute}</span>
                {" • "}
                Missing any day enabled:{" "}
                <span className="font-medium text-[var(--to-ink)]">{missingAnyDay}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[var(--to-ink-muted)]">
                    <tr className="border-b border-[var(--to-border)]">
                      <th className="py-2 pr-3 text-left font-medium">Tech</th>
                      <th className="py-2 pr-3 text-left font-medium">Start</th>
                      <th className="py-2 pr-3 text-left font-medium">End</th>
                      <th className="py-2 pr-3 text-left font-medium">Default route</th>
                      <th className="py-2 pr-3 text-left font-medium">Days</th>
                      <th className="py-2 text-right font-medium">Hours/wk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((s: any) => (
                      <tr key={s.schedule_id} className="border-b border-[var(--to-border)]">
                        <td className="py-2 pr-3">{s.full_name ?? "—"}</td>
                        <td className="py-2 pr-3">{s.start_date ?? "—"}</td>
                        <td className="py-2 pr-3">{s.end_date ?? "—"}</td>
                        <td className="py-2 pr-3">
                          {s.default_route_id ? String(s.default_route_id).slice(0, 8) + "…" : "—"}
                        </td>
                        <td className="py-2 pr-3">{dayCode(s)}</td>
                        <td className="py-2 text-right">{sumHours(s)}</td>
                      </tr>
                    ))}
                    {!sample.length && (
                      <tr>
                        <td className="py-3 text-[var(--to-ink-muted)]" colSpan={6}>
                          No schedule rows found for this org.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-[var(--to-ink-muted)]">
                Read-only evidence derived from schedule_admin_v. The table shows the latest row per assignment.
                “Current baseline” is the subset where end_date is NULL or not yet ended.
              </div>
            </>
          )}
        </div>
      </Card>
    </PageShell>
  );
}