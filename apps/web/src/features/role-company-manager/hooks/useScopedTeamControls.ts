// path: apps/web/src/features/role-company-manager/hooks/useScopedTeamControls.ts

import { useMemo } from "react";
import type { MetricsControlsValue, TeamRowClient } from "@/shared/lib/metrics/buildScopedRows";

export function useScopedTeamControls(
  rows: TeamRowClient[],
  controls: MetricsControlsValue
) {
  const firstClassRows = useMemo(() => {
    return rows.filter((row) => {
      if (controls.office_label && row.office_label !== controls.office_label) {
        return false;
      }

      if (
        controls.affiliation_type &&
        row.affiliation_type !== controls.affiliation_type
      ) {
        return false;
      }

      if (
        controls.contractor_name &&
        row.contractor_name !== controls.contractor_name
      ) {
        return false;
      }

      return true;
    });
  }, [
    rows,
    controls.office_label,
    controls.affiliation_type,
    controls.contractor_name,
  ]);

  const selectedSupervisorId = String(
    controls.reports_to_person_id ?? ""
  ).trim();

  const directRows = useMemo(() => {
    if (!selectedSupervisorId) return [];

    return firstClassRows.filter(
      (row) =>
        String(row.reports_to_person_id ?? "").trim() ===
        selectedSupervisorId
    );
  }, [firstClassRows, selectedSupervisorId]);

  // 🔑 THIS is the correct rule
  // Team scope exists if a supervisor is selected AND there are any rows under them
  const hasSupervisor = Boolean(selectedSupervisorId);
  const hasDirectReports = directRows.length > 0;

  // Optional refinement signal (for AFFILIATION_DIRECT usefulness)
  const hasMultipleAffiliations = useMemo(() => {
    return (
      new Set(
        directRows
          .map((r) => String(r.affiliation_type ?? "").trim())
          .filter(Boolean)
      ).size > 1
    );
  }, [directRows]);

  const showTeamScope = hasSupervisor && hasDirectReports;

  return {
    firstClassRows,
    directRows,
    showTeamScope,
    hasMultipleAffiliations,
  };
}