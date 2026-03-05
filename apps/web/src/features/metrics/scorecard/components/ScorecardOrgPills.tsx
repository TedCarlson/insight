import { Pill } from "@/components/ui/Pill";
import type { ScorecardOrgOption } from "../lib/scorecard.types";

export default function ScorecardOrgPills(props: { options: ScorecardOrgOption[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {props.options.map((o) => (
        <Pill key={o.pc_org_id} active={o.is_selected}>
          {o.label}
        </Pill>
      ))}
    </div>
  );
}