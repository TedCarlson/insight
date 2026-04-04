import CompanySupervisorHeader from "../components/CompanySupervisorHeader";
import CompanySupervisorKpiStrip from "../components/CompanySupervisorKpiStrip";
import CompanySupervisorRiskStrip from "../components/CompanySupervisorRiskStrip";
import CompanySupervisorRosterTable from "../components/CompanySupervisorRosterTable";

import { getCompanySupervisorViewPayload } from "../lib/getCompanySupervisorViewPayload.server";

import type { RangeKey } from "@/shared/kpis/engine/resolveKpiOverrides";

type ReportClassType = "P4P" | "SMART" | "TECH";

type Props = {
  range: RangeKey;
  class_type: ReportClassType;
};

export default async function CompanySupervisorPageShell(props: Props) {
  const payload = await getCompanySupervisorViewPayload({
    range: props.range,
    class_type: props.class_type,
  });

  return (
    <div className="space-y-4 p-4">
      <CompanySupervisorHeader header={payload.header} />

      <CompanySupervisorKpiStrip items={payload.kpi_strip} />

      <CompanySupervisorRiskStrip items={payload.risk_strip} />

      <CompanySupervisorRosterTable
        columns={payload.roster_columns}
        rows={payload.roster_rows}
        rubricByKpi={payload.rubricByKpi}
        work_mix={payload.work_mix}
        parityRows={payload.parityRows}
        parityDetailRows={payload.parityDetailRows}
        active_range={props.range}
      />
    </div>
  );
}