import { supabaseServer } from "@/lib/supabase/server";

type Row = Record<string, any>;

export async function OrgWirePanel(props: { pcOrgId: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await (supabase as any)
    .from("org_event_feed_v")
    .select(
      "org_event_id, event_type, actor_label, person_full_name, payload, created_at"
    )
    .eq("pc_org_id", props.pcOrgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-600">
        Failed to load wire feed: {error.message}
      </div>
    );
  }

  const rows = ((data ?? []) as Row[]) || [];

  return (
    <div className="mt-4 space-y-3">
      <div>
        <div className="text-sm font-semibold">Leadership Wire</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          {rows.length} event(s) (most recent first).
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--to-ink-muted)]">No events yet.</p>
      ) : (
        <div
          className="mt-2 overflow-auto rounded border"
          style={{ borderColor: "var(--to-border)" }}
        >
          <table className="min-w-[900px] text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "var(--to-border)" }}
              >
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Person</th>
                <th className="px-3 py-2 text-left">Actor</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const payload = r.payload ?? {};
                const position = payload.position_title ?? "";
                const start = payload.start_date ?? "";
                const reason = payload.reason_code ?? "";
                const notes = payload.notes ?? "";
                const details = [
                  position ? `title: ${position}` : null,
                  start ? `start: ${start}` : null,
                  reason ? `reason: ${reason}` : null,
                  notes ? `notes: ${notes}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <tr
                    key={String(r.org_event_id)}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "var(--to-border)" }}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(r.created_at ?? "")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(r.event_type ?? "")}
                    </td>
                    <td className="px-3 py-2">
                      {String(r.person_full_name ?? r.person_id ?? "")}
                    </td>
                    <td className="px-3 py-2">
                      {String(r.actor_label ?? r.actor_user_id ?? "")}
                    </td>
                    <td className="px-3 py-2 min-w-[380px]">
                      {details || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
