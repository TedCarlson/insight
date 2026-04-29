// path: apps/web/src/features/role-company-supervisor/hooks/useSupervisorHeaderScope.ts

"use client";

import { useMemo } from "react";

import type {
  MetricsControlsValue,
  TeamRowClient,
} from "@/shared/lib/metrics/buildScopedRows";
import type { MetricsSmartHeaderModel } from "@/shared/surfaces/MetricsSmartHeader";
import type { MetricsSurfacePayload } from "@/shared/types/metrics/surfacePayload";

type Args = {
  controls: MetricsControlsValue;
  allRows: TeamRowClient[];
  scopedRows: TeamRowClient[];
  header: MetricsSurfacePayload["header"];
};

type Result = {
  scopeLabel: string | null;
  headerModel: MetricsSmartHeaderModel;
};

function buildScopeLabel(controls: MetricsControlsValue): string | null {
  if (controls.reports_to_person_id) return "Supervisor Team";
  if (controls.contractor_name) return "Contractor";
  if (controls.office_label) return "Office";
  if (controls.affiliation_type) return "Affiliation";
  return null;
}

export function useSupervisorHeaderScope(args: Args): Result {
  const scopeLabel = useMemo(() => {
    return buildScopeLabel(args.controls);
  }, [args.controls]);

  const totalHeadcount = args.allRows.length;
  const scopeHeadcount = scopeLabel ? args.scopedRows.length : null;

  const headerModel = useMemo<MetricsSmartHeaderModel>(() => {
    return {
      ...args.header,
      total_headcount: totalHeadcount,
      scope_headcount: scopeHeadcount,
    };
  }, [args.header, totalHeadcount, scopeHeadcount]);

  return {
    scopeLabel,
    headerModel,
  };
}