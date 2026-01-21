//apps/web/src/features/roster/RosterLeadPage.tsx

"use client";

import { useMemo, useState } from "react";
import { RosterPageShell, type RosterRow } from "@/features/roster/RosterPageShell";
import { OnboardDrawer, type UnassignedPersonRow } from "@/features/roster/OnboardDrawer";
import { RosterRecordOverlay } from "@/features/roster/RosterRecordOverlay";

import {
  ScheduleMirrorProvider,
  DEFAULT_DAYS_ALL_ON,
  type DaysMap,
} from "@/features/planning/scheduleMirror.store";

type ScheduleSeed = {
  schedule_id: string;
  assignment_id: string;
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

function buildInitialByMembership(rows: RosterRow[], seeds?: ScheduleSeed[] | null) {
  const byAssignmentDays: Record<string, DaysMap> = {};
  for (const s of seeds ?? []) {
    byAssignmentDays[s.assignment_id] = {
      sun: Boolean(s.sun),
      mon: Boolean(s.mon),
      tue: Boolean(s.tue),
      wed: Boolean(s.wed),
      thu: Boolean(s.thu),
      fri: Boolean(s.fri),
      sat: Boolean(s.sat),
    };
  }

  const seed: Record<string, DaysMap> = {};
  for (const r of rows) {
    const assignmentId = r.assignment_id ?? null;
    seed[r.person_pc_org_id] =
      assignmentId && byAssignmentDays[assignmentId]
        ? byAssignmentDays[assignmentId]
        : DEFAULT_DAYS_ALL_ON;
  }
  return seed;
}

export function RosterLeadPage(props: {
  rosterRows: RosterRow[];
  rosterError: string | null;
  unassigned: UnassignedPersonRow[];
  unassignedError: string | null;

  // schedule scope + seeds (mirrors Planning)
  weekStart: string;
  weekEnd: string;
  scheduleName: string;
  scheduleSeeds?: ScheduleSeed[] | null;
}) {
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [selected, setSelected] = useState<RosterRow | null>(null);

  const initialByMember = useMemo(
    () => buildInitialByMembership(props.rosterRows, props.scheduleSeeds ?? []),
    [props.rosterRows, props.scheduleSeeds]
  );

  const scheduleIdByAssignment = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of props.scheduleSeeds ?? []) {
      if (s.assignment_id) map[s.assignment_id] = s.schedule_id;
    }
    return map;
  }, [props.scheduleSeeds]);

  return (
    <ScheduleMirrorProvider initialByMember={initialByMember} initialScheduleIdByAssignment={scheduleIdByAssignment}>
      <>
        <RosterPageShell
          surface="lead"
          rosterRows={props.rosterRows}
          rosterError={props.rosterError}
          unassignedError={props.unassignedError}
          onOnboard={() => setOnboardOpen(true)}
          onSelectRow={(row) => setSelected(row)}
        />

        <OnboardDrawer
          open={onboardOpen}
          onClose={() => setOnboardOpen(false)}
          unassigned={props.unassigned}
        />

        <RosterRecordOverlay
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          row={selected}
          scheduleScope={{
            weekStart: props.weekStart,
            weekEnd: props.weekEnd,
            scheduleName: props.scheduleName,
          }}
        />
      </>
    </ScheduleMirrorProvider>
  );
}
