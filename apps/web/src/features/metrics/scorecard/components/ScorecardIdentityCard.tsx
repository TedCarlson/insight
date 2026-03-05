import { Card } from "@/components/ui/Card";
import type { ScorecardHeader } from "../lib/scorecard.types";

export default function ScorecardIdentityCard(props: { header: ScorecardHeader }) {
  const h = props.header;

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold">{h.full_name ?? "—"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {h.affiliation ?? "—"} • Supervisor: {h.supervisor_name ?? "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Tech ID: {h.tech_id ?? "—"} • Fiscal: {h.fiscal_month_key}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <div>{h.pc_org_name ?? "PC Org"}</div>
          <div>
            {h.fiscal_start_date} → {h.fiscal_end_date}
          </div>
        </div>
      </div>
    </Card>
  );
}