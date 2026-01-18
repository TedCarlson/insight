import { supabaseServer } from "@/lib/supabase/server";

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

  const cols = Object.keys(rows[0] ?? {});

  return (
    <div className="mt-4 overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
      <table className="min-w-[900px] text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className="border-b last:border-b-0"
              style={{ borderColor: "var(--to-border)" }}
            >
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 align-top">
                  {r?.[c] === null || r?.[c] === undefined ? "" : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
