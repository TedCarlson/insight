"use client";

import { useState } from "react";
import { RosterPageShell, type RosterRow } from "@/features/roster/RosterPageShell";
import { OnboardDrawer, type UnassignedPersonRow } from "@/features/roster/OnboardDrawer";

export function RosterLeadPage(props: {
  rosterRows: RosterRow[];
  rosterError: string | null;
  unassigned: UnassignedPersonRow[];
  unassignedError: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RosterPageShell
        surface="lead"
        rosterRows={props.rosterRows}
        rosterError={props.rosterError}
        onOnboard={() => setOpen(true)}
        unassignedError={props.unassignedError}
      />

      <OnboardDrawer
        open={open}
        onClose={() => setOpen(false)}
        unassigned={props.unassigned}
      />
    </>
  );
}
