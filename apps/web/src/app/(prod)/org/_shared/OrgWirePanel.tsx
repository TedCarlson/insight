import { supabaseServer } from "@/lib/supabase/server";
import { OrgWireTableClient } from "./OrgWireTableClient";

type Row = Record<string, any>;

export async function OrgWirePanel(props: { pcOrgId: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await (supabase as any)
    .from("org_event_feed_v")
    .select(
      "org_event_id, pc_org_id, event_type, actor_label, person_full_name, person_id, assignment_id, payload, created_at"
    )
    .eq("pc_org_id", props.pcOrgId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-600">
        Failed to load wire feed: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as Row[];

  return (
    <div className="mt-2 space-y-3">
      <div className="text-sm text-[var(--to-ink-muted)]">
        Showing {rows.length} event(s)
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--to-ink-muted)]">No events yet.</p>
      ) : (
        <OrgWireTableClient rows={rows} currentPcOrgId={props.pcOrgId} />
      )}
    </div>
  );
}
