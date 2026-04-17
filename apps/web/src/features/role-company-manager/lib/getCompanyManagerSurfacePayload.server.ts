// path: apps/web/src/features/role-company-manager/lib/getCompanyManagerSurfacePayload.server.ts

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { buildMetricsSurfacePayload } from "@/shared/server/metrics/buildMetricsSurfacePayload.server";
import type {
  MetricsRangeKey,
  MetricsSurfacePayload,
  MetricsSurfaceTeamRow,
} from "@/shared/types/metrics/surfacePayload";
import {
  resolveCompanyManagerScope,
  type CompanyManagerScopeAssignmentRow,
  type CompanyManagerScopePersonRow,
} from "./resolveCompanyManagerScope.server";

type CompanyManagerProfileKey = "NSR" | "SMART";

type ManagerScopeMeta = {
  office_label: string | null;
  reports_to_person_id: string | null;
  leader_name: string | null;
  leader_title: string | null;
  team_class: "ITG" | "BP" | null;
  contractor_name: string | null;
  office_id: string | null;
  affiliation_type: string | null;
  co_code: string | null;
};

type EnrichedMetricsSurfaceTeamRow = MetricsSurfaceTeamRow & {
  leader_name?: string | null;
  leader_title?: string | null;
  team_class?: "ITG" | "BP" | null;
  contractor_name?: string | null;
  office_id?: string | null;
};

function normalizeProfileKey(
  value: string | null | undefined
): CompanyManagerProfileKey {
  return String(value ?? "NSR").trim().toUpperCase() === "SMART"
    ? "SMART"
    : "NSR";
}

function normalizeRangeKey(value: string | null | undefined): MetricsRangeKey {
  const upper = String(value ?? "FM").trim().toUpperCase();
  if (upper === "PREVIOUS") return "PREVIOUS";
  if (upper === "3FM") return "3FM";
  if (upper === "12FM") return "12FM";
  return "FM";
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildEmptyPayload(range: MetricsRangeKey): MetricsSurfacePayload {
  return {
    header: {
      role_label: "Company Manager",
      rep_full_name: null,
      org_display: null,
      pc_label: null,
      scope_headcount: 0,
      total_headcount: 0,
      as_of_date: null,
    },
    permissions: {
      can_view_exec_strip: true,
      can_view_risk_strip: true,
      can_view_team_table: true,
      can_view_work_mix: true,
      can_view_parity: true,
      can_view_kpi_rubric: true,
      can_view_tech_drill: true,
      can_view_org_drill: true,
      can_filter_range: true,
      can_filter_scope: false,
      can_sort_table: true,
    },
    filters: {
      active_range: range,
      available_ranges: ["FM", "PREVIOUS", "3FM", "12FM"],
    },
    visibility: {
      show_jobs: false,
      show_risk: true,
      show_work_mix: false,
      show_parity: false,
    },
    executive_kpis: [],
    risk_strip: [],
    team_table: {
      columns: [],
      rows: [],
    },
    overlays: {
      work_mix: null,
      parity_summary: [],
      parity_detail: [],
      jobs_summary: null,
      jobs_detail: [],
    },
  };
}

export async function getCompanyManagerSurfacePayload(args?: {
  profile_key?: string | null;
  range?: string | null;
}): Promise<MetricsSurfacePayload> {
  const scope = await requireSelectedPcOrgServer();
  const profileKey = normalizeProfileKey(args?.profile_key);
  const activeRange = normalizeRangeKey(args?.range);

  if (!scope.ok) {
    return buildEmptyPayload(activeRange);
  }

  const resolvedScope = await resolveCompanyManagerScope();

  const scopedTechIds: string[] = Array.from(
    new Set(
      resolvedScope.scoped_assignments
        .map((row: CompanyManagerScopeAssignmentRow) =>
          String(row.tech_id ?? "").trim()
        )
        .filter(Boolean)
    )
  );

  const basePayload = await buildMetricsSurfacePayload({
    role_key: "COMPANY_MANAGER",
    profile_key: profileKey,
    pc_org_id: scope.selected_pc_org_id,
    range: activeRange,
    scoped_tech_ids: scopedTechIds,
    role_label: resolvedScope.role_label,
    rep_full_name: resolvedScope.rep_full_name,
    visibility: {
      show_jobs: false,
      show_risk: true,
      show_work_mix: false,
      show_parity: false,
    },
  });

  const peopleById = resolvedScope.people_by_id;

  const scopeByTechId = new Map<string, ManagerScopeMeta>(
    resolvedScope.scoped_assignments
      .filter((row: CompanyManagerScopeAssignmentRow) =>
        Boolean(String(row.tech_id ?? "").trim())
      )
      .map((row: CompanyManagerScopeAssignmentRow) => {
        const leaderPersonId = toNullableString(row.leader_person_id);
        const leaderPerson: CompanyManagerScopePersonRow | undefined =
          leaderPersonId ? peopleById.get(leaderPersonId) : undefined;

        const leaderName =
          toNullableString(row.leader_name) ??
          toNullableString(leaderPerson?.full_name) ??
          null;

        const leaderTitle = toNullableString(row.leader_title);

        return [
          String(row.tech_id ?? "").trim(),
          {
            office_label: toNullableString(row.office_name),
            reports_to_person_id: leaderPersonId,
            leader_name: leaderName,
            leader_title: leaderTitle,
            team_class: row.team_class ?? null,
            contractor_name: toNullableString(row.contractor_name),
            office_id: toNullableString(row.office_id),
            affiliation_type:
              row.team_class === "ITG"
                ? "COMPANY"
                : row.team_class === "BP"
                  ? "CONTRACTOR"
                  : null,
            co_code: toNullableString(row.contractor_name),
          },
        ];
      })
  );

  const enrichedRows: EnrichedMetricsSurfaceTeamRow[] =
    basePayload.team_table.rows.map((row: MetricsSurfaceTeamRow) => {
      const techId = String(row.tech_id ?? "").trim();
      const scopeMeta = techId ? scopeByTechId.get(techId) : undefined;

      return {
        ...row,
        office_label: scopeMeta?.office_label ?? row.office_label ?? null,
        affiliation_type:
          scopeMeta?.affiliation_type ?? row.affiliation_type ?? null,
        reports_to_person_id:
          scopeMeta?.reports_to_person_id ?? row.reports_to_person_id ?? null,
        co_code: scopeMeta?.co_code ?? row.co_code ?? null,
        leader_name: scopeMeta?.leader_name ?? null,
        leader_title: scopeMeta?.leader_title ?? null,
        team_class: scopeMeta?.team_class ?? null,
        contractor_name: scopeMeta?.contractor_name ?? null,
        office_id: scopeMeta?.office_id ?? null,
      };
    });

  return {
    ...basePayload,
    header: {
      ...basePayload.header,
      total_headcount: scopedTechIds.length,
      scope_headcount: enrichedRows.length,
    },
    team_table: {
      ...basePayload.team_table,
      rows: enrichedRows,
    },
  } as MetricsSurfacePayload;
}