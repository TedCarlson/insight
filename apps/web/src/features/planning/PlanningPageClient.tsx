"use client";

import { useMemo, useState } from "react";
import { PlanningGrid } from "@/features/planning/PlanningGrid";
import {
  ScheduleMirrorProvider,
  DEFAULT_DAYS_ALL_ON,
  type DaysMap,
} from "@/features/planning/scheduleMirror.store";
import { RosterRecordOverlay } from "@/features/roster/RosterRecordOverlay";
import type { RosterRow } from "@/features/roster/RosterPageShell";

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

function buildInitialByMembership(rows: RosterRow[], seeds: ScheduleSeed[]) {
  const byAssignmentDays: Record<string, DaysMap> = {};
  for (const s of seeds) {
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

export function PlanningPageClient(props: {
  pcOrgId: string;
  rows: RosterRow[];
  weekStart: string;
  weekEnd: string;
  scheduleName: string;
  scheduleSeeds: ScheduleSeed[];
}) {
  const [selected, setSelected] = useState<RosterRow | null>(null);

  const initialByMember = useMemo(
    () => buildInitialByMembership(props.rows, props.scheduleSeeds),
    [props.rows, props.scheduleSeeds]
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
      <PlanningGrid
        pcOrgId={props.pcOrgId}
        rows={props.rows as any[]}
        weekStart={props.weekStart}
        weekEnd={props.weekEnd}
        scheduleName={props.scheduleName}
        scheduleSeeds={props.scheduleSeeds as any[]}
        onSelectRow={(row) => setSelected(row as any)}
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
    </ScheduleMirrorProvider>
  );
}
