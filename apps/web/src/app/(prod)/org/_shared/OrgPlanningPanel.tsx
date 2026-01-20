//apps/web/src/app/(prod)/org/_shared/OrgPlanningPanel.tsx

// apps/web/src/app/(prod)/org/_shared/OrgPlanningPanel.tsx

import { supabaseServer } from "@/lib/supabase/server";
import { toTableWrap, toThead, toRowHover } from "../../_shared/toStyles";

type Row = Record<string, any>;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SurfaceNotice(props: { title: string; message: string; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const bg = tone === "warn" ? "bg-[var(--to-amber-100)]" : "bg-[var(--to-surface)]";

  return (
    <div className={cx("rounded-2xl border border-[var(--to-border)] p-4", bg)}>
      <div className="text-sm font-semibold text-[var(--to-ink)]">{props.title}</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">{props.message}</div>
    </div>
  );
}

export async function OrgPlanningPanel(props: { pcOrgId: string }) {
  const supabase = await supabaseServer();

  // 1) Routes scoped directly by pc_org_id
  const { data: routes, error: routesErr } = await (supabase as any)
    .from("route_admin_v")
    .select("route_id, route_name, pc_org_id, pc_org_name")
    .eq("pc_org_id", props.pcOrgId)
    .order("route_name", { ascending: true });

  if (routesErr) {
    return (
      <div className="mt-2">
        <SurfaceNotice tone="warn" title="Failed to load routes" message={routesErr.message} />
      </div>
    );
  }

  const routeRows = ((routes ?? []) as Row[]) || [];
  const routeIds = routeRows.map((r) => String(r.route_id)).filter(Boolean);

  // 2) Quotas scoped directly by pc_org_id
  const { data: quotas, error: quotasErr } = await (supabase as any)
    .from("quota_admin_v")
    .select("quota_id, route_id, route_name, fiscal_month_label, qt_hours, qt_units, pc_org_id")
    .eq("pc_org_id", props.pcOrgId)
    .order("fiscal_month_label", { ascending: false });

  if (quotasErr) {
    return (
      <div className="mt-2">
        <SurfaceNotice tone="warn" title="Failed to load quotas" message={quotasErr.message} />
      </div>
    );
  }

  // 3) Schedules: view is not org-scoped, so filter by org route_ids
  const schedules: Row[] = [];
  if (routeIds.length > 0) {
    const { data: sched, error: schedErr } = await (supabase as any)
      .from("schedule_admin_v")
      .select("schedule_id, schedule_name, route_id, route_name, fiscal_month_label, active, updated_at")
      .in("route_id", routeIds)
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (schedErr) {
      return (
        <div className="mt-2">
          <SurfaceNotice tone="warn" title="Failed to load schedules" message={schedErr.message} />
        </div>
      );
    }

    schedules.push(...(((sched ?? []) as Row[]) || []));
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Routes */}
      <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--to-ink)]">Routes</div>
            <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
              {routeRows.length} route(s) in this org.
            </div>
          </div>
        </div>

        {routeRows.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--to-ink)]">
            {routeRows.slice(0, 20).map((r) => (
              <li key={String(r.route_id)}>{String(r.route_name ?? "(unnamed)")}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">No routes found.</div>
        )}
      </section>

      {/* Quotas */}
      <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
        <div>
          <div className="text-sm font-semibold text-[var(--to-ink)]">Quotas</div>
          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            {(quotas ?? []).length} quota row(s) for this org.
          </div>
        </div>

        {(quotas ?? []).length > 0 ? (
          <div className="mt-3">
            <div className={toTableWrap}>
              <table className="min-w-[900px] border-collapse text-sm">
                <thead className={cx("sticky top-0 border-b border-[var(--to-border)]", toThead)}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Month
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Route
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Hours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Units
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(quotas as Row[]).slice(0, 50).map((q) => (
                    <tr
                      key={String(q.quota_id)}
                      className={cx("border-b border-[var(--to-border)] last:border-b-0", toRowHover)}
                    >
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(q.fiscal_month_label ?? "")}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(q.route_name ?? q.route_id ?? "")}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{q.qt_hours == null ? "" : String(q.qt_hours)}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{q.qt_units == null ? "" : String(q.qt_units)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">No quotas found.</div>
        )}
      </section>

      {/* Schedules */}
      <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
        <div>
          <div className="text-sm font-semibold text-[var(--to-ink)]">Schedules</div>
          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            {schedules.length} schedule(s) tied to this org’s routes.
          </div>
        </div>

        {schedules.length > 0 ? (
          <div className="mt-3">
            <div className={toTableWrap}>
              <table className="min-w-[900px] border-collapse text-sm">
                <thead className={cx("sticky top-0 border-b border-[var(--to-border)]", toThead)}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Schedule
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Route
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Month
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Active
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.slice(0, 50).map((s) => (
                    <tr
                      key={String(s.schedule_id)}
                      className={cx("border-b border-[var(--to-border)] last:border-b-0", toRowHover)}
                    >
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(s.schedule_name ?? "")}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(s.route_name ?? s.route_id ?? "")}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(s.fiscal_month_label ?? "")}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{s.active == null ? "" : String(!!s.active)}</td>
                      <td className="px-3 py-2 text-[var(--to-ink)]">{String(s.updated_at ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : routeIds.length === 0 ? (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
            No schedules to show because this org has no routes.
          </div>
        ) : (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">No schedules found.</div>
        )}
      </section>
    </div>
  );
}
