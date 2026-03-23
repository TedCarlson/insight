import { supabaseAdmin } from "@/shared/data/supabase/admin";
import type { BandKey } from "@/features/metrics/scorecard/lib/scorecard.types";
import type { BpViewPayload } from "./bpView.types";
import { isoToday } from "./bpViewMetricHelpers";
import { resolveBpScope } from "./resolveBpScope.server";
import { buildBpRosterRows } from "./buildBpRosterRows";
import { buildBpKpiStrip } from "./buildBpKpiStrip";
import { buildBpRiskStrip } from "./buildBpRiskStrip";

export type RangeKey = "FM" | "3FM" | "12FM";

type Args = {
  range: RangeKey;
};

type KpiCfg = {
  kpi_key: string;
  label: string;
  sort: number;
};

type RubricRow = {
  kpi_key: string;
  band_key: BandKey;
  min_value: number | null;
  max_value: number | null;
};

type FactRow = {
  tech_id: string | null;
  metric_date: string | null;
  fiscal_end_date: string | null;
  [key: string]: unknown;
};

function numOrNull(x: unknown): number | null {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function dedupeLatestRowPerFiscalMonth(rows: FactRow[]): FactRow[] {
  const byFiscal = new Map<string, FactRow>();

  for (const row of rows) {
    const fiscal = String(row?.fiscal_end_date ?? "").slice(0, 10);
    if (!fiscal) continue;

    if (!byFiscal.has(fiscal)) {
      byFiscal.set(fiscal, row);
    }
  }

  return Array.from(byFiscal.values());
}

function monthsToTake(range: RangeKey): number {
  if (range === "3FM") return 3;
  if (range === "12FM") return 12;
  return 1;
}

function averageForKpi(rows: FactRow[], kpiKey: string): number | null {
  const nums = rows
    .map((r) => numOrNull(r?.[kpiKey]))
    .filter((v): v is number => v !== null);

  if (!nums.length) return null;

  const sum = nums.reduce((acc, n) => acc + n, 0);
  return sum / nums.length;
}

async function loadViewKpiConfig(
  admin: ReturnType<typeof supabaseAdmin>
): Promise<KpiCfg[]> {
  const [{ data: classRows }, { data: defRows }] = await Promise.all([
    admin.from("metrics_class_kpi_config").select("*").eq("class_type", "TECH"),
    admin.from("metrics_kpi_def").select("kpi_key,customer_label,label"),
  ]);

  const defByKey = new Map<
    string,
    { customer_label?: string | null; label?: string | null }
  >();

  for (const row of (defRows ?? []) as Array<{
    kpi_key?: unknown;
    customer_label?: unknown;
    label?: unknown;
  }>) {
    const k = String(row?.kpi_key ?? "").trim();
    if (!k) continue;

    defByKey.set(k, {
      customer_label:
        row?.customer_label == null ? null : String(row.customer_label),
      label: row?.label == null ? null : String(row.label),
    });
  }

  const out: KpiCfg[] = [];

  for (const row of (classRows ?? []) as Array<Record<string, unknown>>) {
    const kpi_key = String(row?.kpi_key ?? "").trim();
    if (!kpi_key) continue;

    const enabled =
      row.is_enabled ?? row.enabled ?? row.is_active ?? row.active ?? true;
    const show = row.show_in_report ?? row.show ?? true;
    if (!enabled || !show) continue;

    const def = defByKey.get(kpi_key);

    const label =
      (row.label && String(row.label).trim()) ||
      (def?.customer_label && String(def.customer_label).trim()) ||
      (def?.label && String(def.label).trim()) ||
      kpi_key;

    const sort =
      row.sort_order ?? row.display_order ?? row.report_order ?? 999;

    out.push({
      kpi_key,
      label: String(label),
      sort: Number(sort),
    });
  }

  out.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
  return out;
}

async function loadRubrics(
  admin: ReturnType<typeof supabaseAdmin>,
  kpiKeys: string[]
): Promise<Map<string, RubricRow[]>> {
  const out = new Map<string, RubricRow[]>();
  if (!kpiKeys.length) return out;

  const { data } = await admin
    .from("metrics_kpi_rubric")
    .select("kpi_key,band_key,min_value,max_value")
    .eq("is_active", true)
    .in("kpi_key", kpiKeys);

  for (const row of (data ?? []) as Array<{
    kpi_key: string;
    band_key: BandKey;
    min_value: number | null;
    max_value: number | null;
  }>) {
    const key = String(row.kpi_key);
    const arr = out.get(key) ?? [];
    arr.push({
      kpi_key: key,
      band_key: row.band_key,
      min_value: row.min_value,
      max_value: row.max_value,
    });
    out.set(key, arr);
  }

  return out;
}

function buildRangedFactByTech(args: {
  factRows: FactRow[];
  techIds: string[];
  kpis: KpiCfg[];
  range: RangeKey;
}): Map<string, FactRow> {
  const { factRows, techIds, kpis, range } = args;

  const rowsByTech = new Map<string, FactRow[]>();

  for (const row of factRows) {
    const techId = String(row.tech_id ?? "");
    if (!techId) continue;

    const arr = rowsByTech.get(techId) ?? [];
    arr.push(row);
    rowsByTech.set(techId, arr);
  }

  const factByTech = new Map<string, FactRow>();

  for (const techId of techIds) {
    const rows = rowsByTech.get(techId) ?? [];
    const latestRowsByMonth = dedupeLatestRowPerFiscalMonth(rows);
    const selectedRows = latestRowsByMonth.slice(0, monthsToTake(range));

    const syntheticFact: FactRow = {
      tech_id: techId,
      metric_date: selectedRows[0]?.metric_date ?? null,
      fiscal_end_date: selectedRows[0]?.fiscal_end_date ?? null,
    };

    for (const kpi of kpis) {
      syntheticFact[kpi.kpi_key] = averageForKpi(selectedRows, kpi.kpi_key);
    }

    factByTech.set(techId, syntheticFact);
  }

  return factByTech;
}

export async function getBpViewPayload(args: Args): Promise<BpViewPayload> {
  const admin = supabaseAdmin();

  const [scope, p4pConfig] = await Promise.all([
    resolveBpScope(),
    loadViewKpiConfig(admin),
  ]);

  const rubricByKpi = await loadRubrics(
    admin,
    p4pConfig.map((k) => k.kpi_key)
  );

  const techIds = Array.from(
    new Set(
      scope.scoped_assignments
        .map((r) => String(r.tech_id ?? ""))
        .filter(Boolean)
    )
  );

  const pcOrgIds = Array.from(
    new Set(
      scope.scoped_assignments
        .map((r) => String(r.pc_org_id ?? ""))
        .filter(Boolean)
    )
  );

  const factRes = techIds.length
    ? await admin
        .from("metrics_tech_fact_day")
        .select("*")
        .in("pc_org_id", pcOrgIds)
        .in("tech_id", techIds)
        .order("fiscal_end_date", { ascending: false })
        .order("metric_date", { ascending: false })
        .limit(10000)
    : { data: [] as FactRow[] };

  const factByTech = buildRangedFactByTech({
    factRows: (factRes.data ?? []) as FactRow[],
    techIds,
    kpis: p4pConfig,
    range: args.range,
  });

  const roster_rows = buildBpRosterRows({
    scopedAssignments: scope.scoped_assignments,
    peopleById: scope.people_by_id,
    factByTech,
    kpis: p4pConfig,
    rubricByKpi,
    orgLabelsById: scope.org_labels_by_id,
  });

  const kpi_strip = buildBpKpiStrip({
    rosterRows: roster_rows,
    kpis: p4pConfig,
    rubricByKpi,
  });

  const risk_strip = buildBpRiskStrip({
    rosterRows: roster_rows,
    kpis: p4pConfig,
  });

  const orgCount = new Set(
    scope.scoped_assignments
      .map((r) => String(r.pc_org_id ?? ""))
      .filter(Boolean)
  ).size;

  const scope_label =
    scope.role_label === "BP Supervisor"
      ? scope.company_label
        ? `${
            scope.org_labels_by_id.get(scope.selected_pc_org_id) ??
            scope.selected_pc_org_id
          } • ${scope.company_label}`
        : scope.org_labels_by_id.get(scope.selected_pc_org_id) ??
          scope.selected_pc_org_id
      : scope.company_label
        ? `${scope.company_label} • ${orgCount} org${orgCount === 1 ? "" : "s"}`
        : `${orgCount} org${orgCount === 1 ? "" : "s"}`;

  return {
    header: {
      role_label: scope.role_label,
      scope_label,
      org_label:
        scope.org_labels_by_id.get(scope.selected_pc_org_id) ??
        scope.selected_pc_org_id,
      org_count: orgCount,
      range_label: args.range,
      as_of_date: isoToday(),
    },
    kpi_strip,
    risk_strip,
    roster_columns: p4pConfig.map((k) => ({
      kpi_key: k.kpi_key,
      label: k.label,
    })),
    roster_rows,
  };
}