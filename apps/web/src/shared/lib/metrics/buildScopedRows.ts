// path: apps/web/src/shared/lib/metrics/buildScopedRows.ts

import type { MetricsSurfacePayload } from "@/shared/types/metrics/surfacePayload";

export type MetricsControlsValue = {
  office_label: string | null;
  affiliation_type: string | null;
  contractor_name?: string | null;
  reports_to_person_id?: string | null;
  team_scope_mode?: "ROLLUP" | "DIRECT" | "AFFILIATION_DIRECT";
};

export type TeamRowClient = {
  subject_key: string;
  full_name?: string | null;
  tech_id?: string | null;
  composite_score?: number | null;
  rank?: number | null;
  jobs_display?: string | null;
  risk_count?: number | null;
  work_mix?: {
    total: number;
    installs: number;
    tcs: number;
    sros: number;
  } | null;
  office_label?: string | null;
  affiliation_type?: string | null;
  contractor_name?: string | null;
  reports_to_person_id?: string | null;
  reports_to_label?: string | null;
  co_code?: string | null;
  metrics: Array<{
    metric_key: string;
    label?: string | null;
    metric_value: number | null;
    render_band_key?: string | null;
    weighted_points?: number | null;
  }>;
};

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function filterFirstClassRows(
  rows: TeamRowClient[],
  controls: MetricsControlsValue
): TeamRowClient[] {
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
}

function filterDirectRows(
  rows: TeamRowClient[],
  reportsToPersonId: string
): TeamRowClient[] {
  return rows.filter(
    (row) => String(row.reports_to_person_id ?? "").trim() === reportsToPersonId
  );
}

function resolveDominantAffiliation(rows: TeamRowClient[]): string | null {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = String(row.affiliation_type ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return sorted[0]?.[0] ?? null;
}

export function mapTeamRows(payload: MetricsSurfacePayload): TeamRowClient[] {
  return payload.team_table.rows.map((row, index) => {
    const unsafeRow = row as MetricsSurfacePayload["team_table"]["rows"][number] & {
      contractor_name?: string | null;
      leader_name?: string | null;
      leader_title?: string | null;
    };

    const leaderName = toNullableString(unsafeRow.leader_name);
    const leaderTitle = toNullableString(unsafeRow.leader_title);

    const reportsToLabel =
      leaderName && leaderTitle
        ? `${leaderName} • ${leaderTitle}`
        : leaderName ?? leaderTitle ?? null;

    return {
      subject_key:
        row.row_key ??
        row.tech_id?.trim() ??
        `${row.full_name?.trim() || "unknown"}-${row.rank ?? "na"}-${index}`,
      full_name: row.full_name,
      tech_id: row.tech_id,
      composite_score: row.composite_score,
      rank: row.rank,
      jobs_display: row.jobs_display ?? null,
      risk_count: row.risk_count ?? null,
      work_mix: row.work_mix ?? null,
      office_label: row.office_label ?? null,
      affiliation_type: row.affiliation_type ?? null,
      contractor_name: toNullableString(unsafeRow.contractor_name),
      reports_to_person_id: row.reports_to_person_id ?? null,
      reports_to_label: reportsToLabel,
      co_code: row.co_code ?? null,
      metrics: row.metrics.map((metric) => ({
        metric_key: metric.metric_key,
        label: metric.metric_key,
        metric_value: metric.value,
        render_band_key: metric.band_key,
        weighted_points: metric.weighted_points,
      })),
    };
  });
}

export function buildScopedRows(
  rows: TeamRowClient[],
  controls: MetricsControlsValue
): TeamRowClient[] {
  const firstClassRows = filterFirstClassRows(rows, controls);

  const reportsToPersonId = String(controls.reports_to_person_id ?? "").trim();
  if (!reportsToPersonId) {
    return firstClassRows;
  }

  const directRows = filterDirectRows(firstClassRows, reportsToPersonId);
  const teamScopeMode = controls.team_scope_mode ?? "DIRECT";

  if (teamScopeMode === "ROLLUP") {
    // Temporary bridge behavior:
    // with the current flat row model, no descendant tree is available here.
    // Until core cutover provides deeper hierarchy context, rollup resolves to
    // the full direct team slice under the selected reports-to node.
    return directRows;
  }

  if (teamScopeMode === "AFFILIATION_DIRECT") {
    if (controls.affiliation_type) {
      return directRows;
    }

    const dominantAffiliation = resolveDominantAffiliation(directRows);
    if (!dominantAffiliation) {
      return directRows;
    }

    return directRows.filter(
      (row) => String(row.affiliation_type ?? "").trim() === dominantAffiliation
    );
  }

  return directRows;
}