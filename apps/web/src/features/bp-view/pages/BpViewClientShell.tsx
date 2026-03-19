"use client";

import { useMemo, useState } from "react";
import BpViewHeader from "../components/BpViewHeader";
import BpViewKpiStrip from "../components/BpViewKpiStrip";
import BpViewRiskStrip from "../components/BpViewRiskStrip";
import BpViewRosterSurface from "../components/BpViewRosterSurface";
import BpTechDrillDrawer from "../components/BpTechDrillDrawer";
import type {
  BpRangeKey,
  BpViewPayload,
  BpViewRosterRow,
} from "../lib/bpView.types";

export default function BpViewClientShell(props: {
  initialPayload: BpViewPayload;
}) {
  const { initialPayload } = props;

  const [range, setRange] = useState<BpRangeKey>(initialPayload.header.range_label);
  const [selectedRow, setSelectedRow] = useState<BpViewRosterRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const header = useMemo(
    () => ({
      ...initialPayload.header,
      range_label: range,
    }),
    [initialPayload.header, range]
  );

  function openRow(row: BpViewRosterRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-4">
      <BpViewHeader
        header={header}
        range={range}
        onRangeChange={setRange}
      />

      <BpViewKpiStrip items={initialPayload.kpi_strip} />

      <BpViewRiskStrip items={initialPayload.risk_strip} />

      <BpViewRosterSurface
        columns={initialPayload.roster_columns}
        rows={initialPayload.roster_rows}
        onSelectRow={openRow}
      />

      <BpTechDrillDrawer
        open={drawerOpen}
        row={selectedRow}
        range={range}
        onClose={closeDrawer}
      />
    </div>
  );
}