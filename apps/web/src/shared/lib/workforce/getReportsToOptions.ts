// path: apps/web/src/shared/lib/workforce/getReportsToOptions.ts

import type { TeamRowClient } from "@/shared/lib/metrics/buildScopedRows";

type Option = {
  value: string;
  label: string;
};

function hasDownstreamReports(
  rows: TeamRowClient[],
  assignmentId: string | null | undefined
) {
  if (!assignmentId) return false;

  return rows.some(
    (r) => r.reports_to_assignment_id === assignmentId
  );
}

export function getReportsToOptions(
  rows: TeamRowClient[],
  currentRow: TeamRowClient
): Option[] {
  const currentAssignmentId = currentRow.assignment_id;
  const currentAffiliationId = currentRow.affiliation_id;

  const vipLeadership: Option[] = [];
  const companyLeadership: Option[] = [];

  for (const row of rows) {
    const assignmentId = row.assignment_id;
    if (!assignmentId) continue;

    if (assignmentId === currentAssignmentId) continue;

    const isSameAffiliation =
      currentAffiliationId &&
      row.affiliation_id === currentAffiliationId;

    const isLeadershipSeat = row.seat_type === "LEADERSHIP";

    const hasReports = hasDownstreamReports(rows, assignmentId);

    const label =
      row.full_name ??
      row.tech_id ??
      assignmentId;

    // 🔥 GROUP 1: VIP leadership ONLY
    if (isSameAffiliation) {
      if (isLeadershipSeat || hasReports) {
        vipLeadership.push({
          value: assignmentId,
          label,
        });
      }
      continue;
    }

    // 🔥 GROUP 2: COMPANY leadership ONLY
    if (!isSameAffiliation && isLeadershipSeat) {
      companyLeadership.push({
        value: assignmentId,
        label,
      });
    }
  }

  // 🔥 ORDER: VIP FIRST → COMPANY SECOND
  const ordered = [
    ...vipLeadership.sort((a, b) => a.label.localeCompare(b.label)),
    ...companyLeadership.sort((a, b) => a.label.localeCompare(b.label)),
  ];

  // dedupe safety
  const seen = new Set<string>();
  return ordered.filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
}