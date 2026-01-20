"use client";

import { useState } from "react";
import { RosterPageShell, type RosterRow } from "@/features/roster/RosterPageShell";
import { OnboardDrawer, type UnassignedPersonRow } from "@/features/roster/OnboardDrawer";
import { RosterRecordOverlay } from "@/features/roster/RosterRecordOverlay";

export function RosterLeadPage(props: {
  rosterRows: RosterRow[];
  rosterError: string | null;
  unassigned: UnassignedPersonRow[];
  unassignedError: string | null;
}) {
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [selected, setSelected] = useState<RosterRow | null>(null);

  return (
    <>
      <RosterPageShell
        surface="lead"
        rosterRows={props.rosterRows}
        rosterError={props.rosterError}
        unassignedError={props.unassignedError}
        onOnboard={() => setOnboardOpen(true)}
        onSelectRow={(row) => setSelected(row)}
      />

      <OnboardDrawer open={onboardOpen} onClose={() => setOnboardOpen(false)} unassigned={props.unassigned} />

      <RosterRecordOverlay open={Boolean(selected)} onClose={() => setSelected(null)} row={selected} />
    </>
  );
}
