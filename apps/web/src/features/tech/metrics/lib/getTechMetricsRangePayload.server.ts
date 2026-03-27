import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { resolveFiscalSelection } from "@/shared/kpis/core/rowSelection";
import {
  loadResolvedKpiConfig,
  getResolvedKpisForClass,
} from "@/shared/kpis/core/definitionResolver";
import { aggregateResolvedValues } from "@/shared/kpis/core/valueResolver";
import { resolveKpiPresentation } from "@/shared/kpis/core/presentation";
import { resolvePresetPaint } from "@/shared/kpis/core/presetPaint";
import type { MetricsRangeKey, RawMetricRow } from "@/shared/kpis/core/types";
import type {
  ScorecardResponse,
  ScorecardTile,
} from "@/shared/kpis/core/scorecardTypes";

import { getTechScorecardPayload } from "@/features/metrics/scorecard/lib/getTechScorecardPayload.server";

type Args = {
  person_id: string;
  range: MetricsRangeKey;
};

function parseRaw(raw: unknown): Record<string, unknown> {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function buildResolvablePayload(row: any): Record<string, unknown> {
  const parsed = parseRaw(row?.raw);

  return {
    ...row,
    ...parsed,
  };
}

function rangeLabel(range: MetricsRangeKey, fallback: string): string {
  if (range === "FM") return fallback;
  if (range === "PREVIOUS") return "Previous FM";
  if (range === "3FM") return "Last 3 FM";
  return "Last 12 FM";
}

export async function getTechMetricsRangePayload(
  args: Args
): Promise<ScorecardResponse> {
  const base = (await getTechScorecardPayload({
    person_id: args.person_id,
  })) as ScorecardResponse;

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) {
    return base;
  }

  const tech_id = base.header.tech_id;
  if (!tech_id) {
    return base;
  }

  const sb = await supabaseServer();

  const [{ data: rawRows }, resolvedConfig] = await Promise.all([
    sb
      .from("metrics_tech_fact_day")
      .select("*")
      .eq("pc_org_id", scope.selected_pc_org_id)
      .eq("tech_id", tech_id)
      .order("fiscal_end_date", { ascending: false })
      .order("metric_date", { ascending: false })
      .order("inserted_at", { ascending: false })
      .order("batch_id", { ascending: false })
      .limit(1000),
    loadResolvedKpiConfig(),
  ]);

  const rows: RawMetricRow[] = (rawRows ?? []).map((row: any) => ({
    metric_date: String(row.metric_date ?? "").slice(0, 10),
    fiscal_end_date: String(row.fiscal_end_date ?? "").slice(0, 10),
    batch_id: String(row.batch_id ?? ""),
    inserted_at: String(row.inserted_at ?? ""),
    raw: buildResolvablePayload(row),
  }));

  const { selectedFinalRows } = resolveFiscalSelection(rows, args.range);
  const selectedRows = selectedFinalRows.map((item) => item.row.raw);

  if (!selectedRows.length) {
    return {
      ...base,
      header: {
        ...base.header,
        fiscal_month_key: rangeLabel(args.range, base.header.fiscal_month_key),
      },
    };
  }

  const resolvedTechKpis = getResolvedKpisForClass({
    config: resolvedConfig,
    classType: "TECH",
  });

  const resolvedByKey = new Map(
    resolvedTechKpis.map((def) => [def.kpi_key, def])
  );

  const tiles: ScorecardTile[] = base.tiles.map((tile) => {
    const resolvedDef = resolvedByKey.get(tile.kpi_key);

    if (!resolvedDef) {
      return tile;
    }

    const value = aggregateResolvedValues({
      def: resolvedDef,
      rows: selectedRows,
    });

    const presentation = resolveKpiPresentation({
      kpiKey: resolvedDef.kpi_key,
      value,
      rubric: resolvedDef.rubric,
    });

    const paint = resolvePresetPaint({
      bandKey: presentation.band_key,
      activePresetKey: resolvedConfig.activePresetKey,
    });

    return {
      ...tile,
      label: presentation.label,
      value: presentation.value,
      value_display: presentation.value_display,
      band: {
        band_key: presentation.band_key,
        label: presentation.band_label,
        paint,
      },
    };
  });

  return {
    ...base,
    header: {
      ...base.header,
      fiscal_month_key: rangeLabel(args.range, base.header.fiscal_month_key),
    },
    tiles,
  };
}