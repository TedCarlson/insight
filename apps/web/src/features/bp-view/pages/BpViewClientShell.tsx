"use client";

import { useState } from "react";
import BpViewHeader from "../components/BpViewHeader";
import BpViewKpiStrip from "../components/BpViewKpiStrip";
import BpViewRiskStrip from "../components/BpViewRiskStrip";
import BpViewRosterSurface from "../components/BpViewRosterSurface";
import BpTechDrillDrawer from "../components/BpTechDrillDrawer";
import type { BpViewPayload, BpViewRosterRow } from "../lib/bpView.types";

export default function BpViewClientShell(props: {
  initialPayload: BpViewPayload;
}) {
  const { initialPayload } = props;

  const [selectedRow, setSelectedRow] = useState<BpViewRosterRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function onSelectRow(row: BpViewRosterRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  function onCloseDrawer() {
    setDrawerOpen(false);
  }

  return (
    <div className="space-y-4">
      <BpViewHeader header={initialPayload.header} />
      <BpViewKpiStrip items={initialPayload.kpi_strip} />
      <BpViewRiskStrip items={initialPayload.risk_strip} />
      <BpViewRosterSurface
        columns={initialPayload.roster_columns}
        rows={initialPayload.roster_rows}
        onSelectRow={onSelectRow}
      />
      <BpTechDrillDrawer
        open={drawerOpen}
        row={selectedRow}
        range={initialPayload.header.range_label}
        onClose={onCloseDrawer}
      />
    </div>
  );
}