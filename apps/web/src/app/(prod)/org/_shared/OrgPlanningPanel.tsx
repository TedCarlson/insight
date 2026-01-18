import { supabaseServer } from "@/lib/supabase/server";

type Row = Record<string, any>;

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
      <div className="mt-2 text-sm text-red-600">
        Failed to load routes: {routesErr.message}
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
      <div className="mt-2 text-sm text-red-600">
        Failed to load quotas: {quotasErr.message}
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
        <div className="mt-2 text-sm text-red-600">
          Failed to load schedules: {schedErr.message}
        </div>
      );
    }

    schedules.push(...(((sched ?? []) as Row[]) || []));
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <div className="text-sm font-semibold">Routes</div>
        <div className="mt-2 text-sm text-[var(--to-ink-muted)]">
          {routeRows.length} route(s) in this org.
        </div>

        {routeRows.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {routeRows.slice(0, 20).map((r) => (
              <li key={String(r.route_id)}>
                {String(r.route_name ?? "(unnamed)")}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <div className="text-sm font-semibold">Quotas</div>
        <div className="mt-2 text-sm text-[var(--to-ink-muted)]">
          {(quotas ?? []).length} quota row(s) for this org.
        </div>

        {(quotas ?? []).length > 0 ? (
          <div className="mt-3 overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
            <table className="min-w-[900px] text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Route</th>
                  <th className="px-3 py-2 text-left">Hours</th>
                  <th className="px-3 py-2 text-left">Units</th>
                </tr>
              </thead>
              <tbody>
                {(quotas as Row[]).slice(0, 50).map((q) => (
                  <tr key={String(q.quota_id)} className="border-b last:border-b-0" style={{ borderColor: "var(--to-border)" }}>
                    <td className="px-3 py-2">{String(q.fiscal_month_label ?? "")}</td>
                    <td className="px-3 py-2">{String(q.route_name ?? q.route_id ?? "")}</td>
                    <td className="px-3 py-2">{q.qt_hours == null ? "" : String(q.qt_hours)}</td>
                    <td className="px-3 py-2">{q.qt_units == null ? "" : String(q.qt_units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-sm font-semibold">Schedules</div>
        <div className="mt-2 text-sm text-[var(--to-ink-muted)]">
          {schedules.length} schedule(s) tied to this org’s routes.
        </div>

        {schedules.length > 0 ? (
          <div className="mt-3 overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
            <table className="min-w-[900px] text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
                  <th className="px-3 py-2 text-left">Schedule</th>
                  <th className="px-3 py-2 text-left">Route</th>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {schedules.slice(0, 50).map((s) => (
                  <tr key={String(s.schedule_id)} className="border-b last:border-b-0" style={{ borderColor: "var(--to-border)" }}>
                    <td className="px-3 py-2">{String(s.schedule_name ?? "")}</td>
                    <td className="px-3 py-2">{String(s.route_name ?? s.route_id ?? "")}</td>
                    <td className="px-3 py-2">{String(s.fiscal_month_label ?? "")}</td>
                    <td className="px-3 py-2">{s.active == null ? "" : String(!!s.active)}</td>
                    <td className="px-3 py-2">{String(s.updated_at ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
