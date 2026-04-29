// path: apps/web/src/shared/server/metrics/reports/buildRollupReportPayload.server.ts

import {
  mapTeamRows,
  type TeamRowClient,
} from "@/shared/lib/metrics/buildScopedRows";
import { buildScopedExecutiveStrip } from "@/shared/lib/metrics/buildScopedExecutiveStrip";
import type { MetricsSurfacePayload } from "@/shared/types/metrics/surfacePayload";

export type RollupTeamClass = "ITG" | "BP";
export type RollupReportClass = "NSR" | "SMART";
export type RollupReportRange = "FM" | "PREVIOUS" | "3FM" | "12FM";

export type RollupKpi = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string;
  band_key: string | null;
};

export type SupervisorRollupRow = {
  supervisor_person_id: string;
  supervisor_name: string;
  team_class: RollupTeamClass;
  rollup_hc: number;
  composite_score: number | null;
  rank: number;
  kpis: RollupKpi[];
};

export type RollupReportPayload = {
  header: {
    generated_at: string;
    class_type: RollupReportClass;
    range: RollupReportRange;
    org_display: string | null;
  };
  segments: {
    itg_supervisors: SupervisorRollupRow[];
    bp_supervisors: SupervisorRollupRow[];
    all_supervisors: SupervisorRollupRow[];
  };
};

type RowWithChain = TeamRowClient & {
  supervisor_chain_person_ids?: unknown;
  leader_name?: string | null;
  leader_title?: string | null;
  team_class?: RollupTeamClass | null;
};

type SupervisorOption = {
  supervisor_person_id: string;
  supervisor_name: string;
};

function isValidHcRow(row: TeamRowClient) {
  const techId = cleanString(row.tech_id);
  if (!techId || techId.startsWith("UNASSIGNED-")) return false;

  const metric = findMetric(row, "ftr_contact_jobs");
  const value = readNumeric(metric?.denominator ?? metric?.metric_value);

  return value != null && value > 0;
}

function cleanString(value: unknown) {
  const next = String(value ?? "").trim();
  return next ? next : null;
}

function normalizeLeaderName(value: unknown) {
  const text = cleanString(value);
  if (!text) return null;
  return text.split("•")[0]?.trim() || text;
}

function normalizeChain(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function getDirectSupervisorId(row: TeamRowClient) {
  return cleanString(row.reports_to_person_id);
}

function getDirectSupervisorLabel(row: TeamRowClient) {
  return normalizeLeaderName(row.reports_to_label);
}

function getSupervisorChainIds(row: TeamRowClient) {
  const unsafeRow = row as RowWithChain;
  const directId = getDirectSupervisorId(row);
  const chain = normalizeChain(unsafeRow.supervisor_chain_person_ids);

  if (directId && !chain.includes(directId)) {
    return [directId, ...chain];
  }

  return chain;
}

function getRowTeamClass(row: TeamRowClient): RollupTeamClass | null {
  const unsafeRow = row as RowWithChain;
  const explicit = cleanString(unsafeRow.team_class)?.toUpperCase();

  if (explicit === "ITG" || explicit === "BP") return explicit;

  const affiliationType = cleanString(row.affiliation_type)?.toUpperCase();
  if (affiliationType === "COMPANY") return "ITG";
  if (affiliationType === "CONTRACTOR") return "BP";

  return null;
}

function buildSupervisorLabelMap(rows: TeamRowClient[]) {
  const map = new Map<string, string>();

  for (const row of rows) {
    const id = getDirectSupervisorId(row);
    const label = getDirectSupervisorLabel(row);

    if (!id || !label) continue;
    if (!map.has(id)) map.set(id, label);
  }

  return map;
}

function getUniqueSupervisors(rows: TeamRowClient[]): SupervisorOption[] {
  const labelMap = buildSupervisorLabelMap(rows);
  const ids = new Set<string>();

  for (const row of rows) {
    const directId = getDirectSupervisorId(row);
    if (directId) ids.add(directId);

    for (const id of getSupervisorChainIds(row)) {
      if (id) ids.add(id);
    }
  }

  return [...ids]
    .map((id): SupervisorOption | null => {
      const label = labelMap.get(id);
      if (!label) return null;

      return {
        supervisor_person_id: id,
        supervisor_name: label,
      };
    })
    .filter((item): item is SupervisorOption => item !== null)
    .sort((a, b) => a.supervisor_name.localeCompare(b.supervisor_name));
}

function isManagerSupervisor(args: {
  payload: MetricsSurfacePayload;
  supervisor: SupervisorOption;
}) {
  const repName = normalizeLeaderName(args.payload.header.rep_full_name);
  if (!repName) return false;

  return args.supervisor.supervisor_name === repName;
}

function isDirectReportTo(row: TeamRowClient, supervisorPersonId: string) {
  return getDirectSupervisorId(row) === supervisorPersonId;
}

function isOneHopBpReportToManager(
  row: TeamRowClient,
  supervisorPersonId: string
) {
  const chain = getSupervisorChainIds(row);
  const directSupervisorId = chain[0] ?? null;
  const parentSupervisorId = chain[1] ?? null;

  if (!directSupervisorId || parentSupervisorId !== supervisorPersonId) {
    return false;
  }

  return getRowTeamClass(row) === "BP";
}

/**
 * Segment behavior #1 and #2:
 * ITG/BP sections use chain rollup behavior.
 */
function getChainRowsForSupervisor(args: {
  payload: MetricsSurfacePayload;
  rows: TeamRowClient[];
  supervisor: SupervisorOption;
}) {
  const supervisorId = args.supervisor.supervisor_person_id;

  if (
    isManagerSupervisor({
      payload: args.payload,
      supervisor: args.supervisor,
    })
  ) {
    return args.rows.filter(
      (row) =>
        isDirectReportTo(row, supervisorId) ||
        isOneHopBpReportToManager(row, supervisorId)
    );
  }

  return args.rows.filter((row) =>
    getSupervisorChainIds(row).includes(supervisorId)
  );
}

/**
 * Segment behavior #3:
 * All Supervisors uses direct-only ownership so HC does not stack chain rollups.
 */
function getDirectRowsForSupervisor(args: {
  rows: TeamRowClient[];
  supervisor: SupervisorOption;
}) {
  return args.rows.filter((row) =>
    isDirectReportTo(row, args.supervisor.supervisor_person_id)
  );
}

function inferTeamClass(args: {
  supervisor_person_id: string;
  rows: TeamRowClient[];
}): RollupTeamClass {
  const directRows = args.rows.filter((row) =>
    isDirectReportTo(row, args.supervisor_person_id)
  );

  const rowsToInspect = directRows.length ? directRows : args.rows;

  const hasCompany = rowsToInspect.some(
    (row) => getRowTeamClass(row) === "ITG"
  );

  return hasCompany ? "ITG" : "BP";
}

function getDefinitionOrder(payload: MetricsSurfacePayload): string[] {
  const runtimeDefs = payload.executive_strip?.runtime?.definitions ?? [];

  if (runtimeDefs.length) {
    return runtimeDefs
      .map((definition: any) => String(definition.kpi_key ?? "").trim())
      .filter(Boolean);
  }

  return (payload.team_table.columns ?? [])
    .map((column) => String(column.kpi_key ?? "").trim())
    .filter(Boolean);
}

function getVisibleKpiKeys(args: {
  payload: MetricsSurfacePayload;
  class_type: RollupReportClass;
}) {
  const ordered = getDefinitionOrder(args.payload);
  const limit = args.class_type === "SMART" ? 7 : 4;
  return ordered.slice(0, limit);
}

function getKpiLabel(args: { payload: MetricsSurfacePayload; kpi_key: string }) {
  const runtimeDefs = args.payload.executive_strip?.runtime?.definitions ?? [];
  const runtimeDef = runtimeDefs.find(
    (definition: any) => definition.kpi_key === args.kpi_key
  );

  if (runtimeDef?.customer_label) return String(runtimeDef.customer_label);
  if (runtimeDef?.label) return String(runtimeDef.label);

  const column = args.payload.team_table.columns.find(
    (c) => c.kpi_key === args.kpi_key
  );

  return column?.label ?? args.kpi_key;
}

function readNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/[,%]/g, "").trim();
    if (!cleaned || cleaned === "—") return null;

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readExecutiveValue(item: any): number | null {
  return (
    readNumeric(item?.value_numeric) ??
    readNumeric(item?.metric_value) ??
    readNumeric(item?.value) ??
    readNumeric(item?.raw_value) ??
    readNumeric(item?.current_value) ??
    readNumeric(item?.value_display)
  );
}

function formatMetricValue(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function findMetric(row: TeamRowClient, kpiKey: string): any | null {
  return (
    (row.metrics ?? []).find((metric: any) => metric.metric_key === kpiKey) ??
    null
  );
}

function aggregateMetricFromRows(rows: TeamRowClient[], kpiKey: string) {
  let numerator = 0;
  let denominator = 0;
  let valueTotal = 0;
  let valueCount = 0;

  for (const row of rows) {
    const metric = findMetric(row, kpiKey);
    if (!metric) continue;

    const n = readNumeric(metric.numerator);
    const d = readNumeric(metric.denominator);

    if (n != null && d != null && d > 0) {
      numerator += n;
      denominator += d;
      continue;
    }

    const value = readNumeric(metric.metric_value);
    if (value != null) {
      valueTotal += value;
      valueCount++;
    }
  }

  if (denominator > 0) return numerator / denominator;
  if (valueCount > 0) return valueTotal / valueCount;

  return null;
}

function computeComposite(rows: TeamRowClient[]) {
  let total = 0;
  let count = 0;

  for (const row of rows) {
    const value = readNumeric(row.composite_score);
    if (value == null) continue;

    total += value;
    count++;
  }

  return count > 0 ? total / count : null;
}

function buildKpis(args: {
  payload: MetricsSurfacePayload;
  rows: TeamRowClient[];
  executiveItems: any[];
  visibleKpiKeys: string[];
}) {
  return args.visibleKpiKeys.map((kpiKey) => {
    const executiveItem = args.executiveItems.find(
      (item: any) => item?.kpi_key === kpiKey
    );

    const value =
      readExecutiveValue(executiveItem) ??
      aggregateMetricFromRows(args.rows, kpiKey);

    return {
      kpi_key: kpiKey,
      label: getKpiLabel({ payload: args.payload, kpi_key: kpiKey }),
      value,
      value_display: formatMetricValue(value),
      band_key: executiveItem?.band_key ?? null,
    };
  });
}

function buildSupervisorRow(args: {
  payload: MetricsSurfacePayload;
  supervisor: SupervisorOption;
  rows: TeamRowClient[];
  visibleKpiKeys: string[];
}): SupervisorRollupRow | null {
  const { payload, supervisor, rows, visibleKpiKeys } = args;

  if (!rows.length) return null;

  const executiveItems = buildScopedExecutiveStrip({
    runtime: payload.executive_strip?.runtime ?? null,
    scopedRows: rows,
    fallbackItems: payload.executive_strip?.scope?.items ?? [],
  });

  const hcRows = rows.filter(isValidHcRow);
  
  return {
    supervisor_person_id: supervisor.supervisor_person_id,
    supervisor_name: supervisor.supervisor_name,
    team_class: inferTeamClass({
      supervisor_person_id: supervisor.supervisor_person_id,
      rows,
    }),
    rollup_hc: rows.length,
    composite_score: computeComposite(rows),
    rank: 0,
    kpis: buildKpis({
      payload,
      
      rows: hcRows,
      executiveItems,
      visibleKpiKeys,
    }),
  };
}

function rankRows(rows: SupervisorRollupRow[]) {
  return [...rows]
    .sort((a, b) => {
      const av = a.composite_score;
      const bv = b.composite_score;

      if (bv == null && av == null) {
        return a.supervisor_name.localeCompare(b.supervisor_name);
      }

      if (bv == null) return -1;
      if (av == null) return 1;
      if (bv !== av) return bv - av;

      return a.supervisor_name.localeCompare(b.supervisor_name);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export function buildRollupReportPayload(args: {
  payload: MetricsSurfacePayload;
  class_type: RollupReportClass;
  range: RollupReportRange;
}): RollupReportPayload {
  const { payload, class_type, range } = args;

  const allRows = mapTeamRows(payload);
  const supervisors = getUniqueSupervisors(allRows);
  const visibleKpiKeys = getVisibleKpiKeys({ payload, class_type });

  const chainRows: SupervisorRollupRow[] = [];
  const directRows: SupervisorRollupRow[] = [];

  for (const supervisor of supervisors) {
    const chainRow = buildSupervisorRow({
      payload,
      supervisor,
      rows: getChainRowsForSupervisor({
        payload,
        rows: allRows,
        supervisor,
      }),
      visibleKpiKeys,
    });

    if (chainRow) chainRows.push(chainRow);

    const directRow = buildSupervisorRow({
      payload,
      supervisor,
      rows: getDirectRowsForSupervisor({
        rows: allRows,
        supervisor,
      }),
      visibleKpiKeys,
    });

    if (directRow) directRows.push(directRow);
  }

  return {
    header: {
      generated_at: new Date().toISOString(),
      class_type,
      range,
      org_display: payload.header.org_display,
    },
    segments: {
      itg_supervisors: rankRows(
        chainRows.filter((row) => row.team_class === "ITG")
      ),
      bp_supervisors: rankRows(
        chainRows.filter((row) => row.team_class === "BP")
      ),
      all_supervisors: rankRows(directRows),
    },
  };
}