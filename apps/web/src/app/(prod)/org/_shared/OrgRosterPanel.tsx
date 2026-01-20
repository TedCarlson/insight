// apps/web/src/app/(prod)/org/_shared/OrgRosterPanel.tsx

import { supabaseServer } from "@/lib/supabase/server";
import { OrgRosterClient } from "./OrgRosterClient";

export type MasterRosterRow = {
  assignment_id: string;
  pc_org_id: string;
  pc_org_name: string;
  person_id: string;
  full_name: string;
  mobile: string | null;
  tech_id: string | null;
  position_title: string | null;
  start_date: string | null;
  end_date: string | null;
  assignment_active: boolean | null;

  reports_to_assignment_id: string | null;
  reports_to_person_id: string | null;
  reports_to_full_name: string | null;

  co_name: string | null;
  co_type: "company" | "contractor" | null;
  co_code: string | null;
};

function SurfaceNotice(props: {
  title: string;
  message: string;
  tone?: "neutral" | "warn";
}) {
  const tone = props.tone ?? "neutral";

  const bg =
    tone === "warn" ? "bg-[var(--to-amber-100)]" : "bg-[var(--to-surface)]";

  return (
    <div className={`rounded-2xl border border-[var(--to-border)] ${bg} p-4`}>
      <div className="text-sm font-semibold text-[var(--to-ink)]">{props.title}</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">{props.message}</div>
    </div>
  );
}

export async function OrgRosterPanel(props: { pcOrgId: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await (supabase as any)
    .from("master_roster_v")
    .select("*")
    .eq("pc_org_id", props.pcOrgId)
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <div className="mt-2">
        <SurfaceNotice
          tone="warn"
          title="Failed to load roster"
          message={error.message}
        />
      </div>
    );
  }

  const rows = ((data ?? []) as unknown as MasterRosterRow[]) ?? [];

  return (
    <div className="mt-2 space-y-3">
      {rows.length === 0 ? (
        <SurfaceNotice
          title="No roster rows"
          message="No roster rows returned for this org."
        />
      ) : null}

      <OrgRosterClient rows={rows} pcOrgId={props.pcOrgId} />
    </div>
  );
}
