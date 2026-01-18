import { supabaseServer } from "@/lib/supabase/server";
import { OrgRosterClient } from "./OrgRosterClient";

type Row = Record<string, any>;

export async function OrgRosterPanel(props: { pcOrgId: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("pc_org_roster_drilldown_for_pc_org", {
    p_pc_org_id: props.pcOrgId,
  });

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-600">
        Failed to load roster drilldown: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
        No roster rows returned for this org.
      </p>
    );
  }

  return <OrgRosterClient rows={rows} />;
}
