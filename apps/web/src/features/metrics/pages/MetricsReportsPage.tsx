// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/pages/MetricsReportsPage.tsx

import { redirect } from "next/navigation";

import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import FiscalSelector from "@/features/metrics/components/FiscalSelector";
import ReportsFilterBar from "@/features/metrics/components/reports/ReportsFilterBar";
import ReportsClientShell from "@/features/metrics/components/reports/ReportsClientShell";

import { ReportingTable } from "@/features/metrics/components/reports/ReportingTable";
import ReportSummaryTiles from "@/features/metrics/components/reports/ReportSummaryTiles";

import { numOrInf } from "@/features/metrics/lib/reports/format";
import { resolveRubricKey, buildRubricMap, applyBandsToRows } from "@/features/metrics/lib/reports/rubric";
import { computeP4PRollup } from "@/features/metrics/lib/reports/rollup";

import { GLOBAL_BAND_PRESETS } from "@/features/metrics-admin/lib/globalBandPresets";
import { P4P_KPIS } from "@/features/metrics/lib/reports/kpis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { fiscal?: string; reports_to?: string };

type BatchMeta = {
  batch_id: string;
  metric_date: string;
  fiscal_end_date: string;
};

function currentFiscalEndDateISO_NY(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  let endYear = year;
  let endMonth = month;

  if (day >= 22) {
    endMonth = month + 1;
    if (endMonth === 13) {
      endMonth = 1;
      endYear = year + 1;
    }
  }

  return `${endYear}-${String(endMonth).padStart(2, "0")}-21`;
}

function dedupeByTechId(rows: any[]) {
  const by = new Map<string, any>();
  for (const r of rows) {
    const k = String(r.tech_id ?? "");
    const prev = by.get(k);
    if (!prev) {
      by.set(k, r);
      continue;
    }

    const prevOk = String(prev.status_badge ?? "") === "OK";
    const curOk = String(r.status_badge ?? "") === "OK";
    if (curOk && !prevOk) {
      by.set(k, r);
      continue;
    }

    if (curOk === prevOk) {
      const pr = numOrInf(prev.rank_in_pc);
      const cr = numOrInf(r.rank_in_pc);
      if (cr < pr) by.set(k, r);
    }
  }
  return Array.from(by.values());
}

function isRubricRowMeaningful(r: any) {
  return r?.min_value != null || r?.max_value != null || r?.score_value != null;
}

function filterEmptyRubricGroups(rows: any[]) {
  const byKpi = new Map<string, any[]>();
  for (const r of rows) {
    const k = String(r.kpi_key ?? "");
    const arr = byKpi.get(k) ?? [];
    arr.push(r);
    byKpi.set(k, arr);
  }

  const out: any[] = [];
  for (const [, group] of byKpi.entries()) {
    if (!group.some(isRubricRowMeaningful)) continue;
    out.push(...group);
  }
  return out;
}

async function loadBatchMetaForFiscal(sb: any, pc_org_id: string, fiscal_end_date: string): Promise<BatchMeta | null> {
  const { data } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, metric_date, fiscal_end_date, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_end_date", fiscal_end_date)
    .eq("status", "loaded")
    .order("metric_date", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (!row?.batch_id) return null;

  return {
    batch_id: String(row.batch_id),
    metric_date: String(row.metric_date),
    fiscal_end_date: String(row.fiscal_end_date),
  };
}

// prior batch within SAME fiscal_end_date
async function loadPriorBatchMeta(
  sb: any,
  pc_org_id: string,
  fiscal_end_date: string,
  before_metric_date: string
): Promise<BatchMeta | null> {
  const { data } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, metric_date, fiscal_end_date, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_end_date", fiscal_end_date)
    .eq("status", "loaded")
    .lt("metric_date", before_metric_date)
    .order("metric_date", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (!row?.batch_id) return null;

  return {
    batch_id: String(row.batch_id),
    metric_date: String(row.metric_date),
    fiscal_end_date: String(row.fiscal_end_date),
  };
}

type BatchRowsResult = {
  rowsNoTotals: any[];
  rowsWithTotals: any[]; // includes totals row if present (kept for debugging if needed)
};

// Pull from the archive-backed view (v4)
async function buildRowsForBatch(sb: any, batch_id: string): Promise<BatchRowsResult> {
  const { data, error } = await sb
    .from("metrics_p4p_report_v2")
    .select(
      [
        "batch_id",
        "pc_org_id",
        "fiscal_end_date",
        "metric_date",

        "tech_id",
        "person_id",
        "reports_to_person_id",

        "rank_in_pc",
        "weighted_score",
        "population_size",

        "status_badge",
        "is_outlier",
        "is_totals",

        "office_id",
        "position_title",

        // KPI rates (already resolved via COALESCE in v4)
        "tnps_score",
        "ftr_rate",
        "tool_usage_rate",

        // denominators / volume
        "tnps_surveys",
        "ftr_contact_jobs",
        "tu_eligible_jobs",

        // raw counts (optional but useful for sanity + potential UI compute)
        "tu_result",
        "total_jobs",
        "total_appts",
      ].join(",")
    )
    .eq("batch_id", batch_id);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("metrics_p4p_report_v2load error", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      batch_id,
    });
  }

  const mapped = (data ?? []).map((r: any) => {
    const status = String(r.status_badge ?? "OK");

    return {
      tech_id: String(r.tech_id ?? ""),
      person_id: r.person_id ?? null,
      reports_to_person_id: r.reports_to_person_id ?? null,

      metric_date: r.metric_date ?? null,
      fiscal_end_date: r.fiscal_end_date ?? null,

      weighted_score: r.weighted_score ?? null,
      rank_in_pc: r.rank_in_pc ?? null,
      population_size: r.population_size ?? null,

      tnps_score: r.tnps_score ?? null,
      ftr_rate: r.ftr_rate ?? null,
      tool_usage_rate: r.tool_usage_rate ?? null,

      tnps_surveys: r.tnps_surveys ?? null,
      ftr_contact_jobs: r.ftr_contact_jobs ?? null, // ✅ Volume column
      tu_eligible_jobs: r.tu_eligible_jobs ?? null,
      tu_result: r.tu_result ?? null,

      total_jobs: r.total_jobs ?? null,
      total_appts: r.total_appts ?? null,

      office_id: r.office_id ?? null,
      position_title: r.position_title ?? null,

      is_totals: Boolean(r.is_totals),
      is_outlier: Boolean(r.is_outlier),

      status_badge: status,
      status_sort: status === "OK" ? 0 : status === "TOTALS" ? 99 : 10,
    };
  });

  // keep any totals row around for debugging, but table should never show it
  const rowsWithTotals = dedupeByTechId(mapped);
  const rowsNoTotals = rowsWithTotals.filter((x: any) => !x.is_totals && String(x.status_badge ?? "") !== "TOTALS");

  return { rowsNoTotals, rowsWithTotals };
}

function sumInt(rows: any[], field: string): number {
  let s = 0;
  for (const r of rows) {
    const v = r?.[field];
    if (typeof v === "number" && Number.isFinite(v)) s += v;
  }
  return s;
}

export default async function MetricsReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const scopeAuth = await requireSelectedPcOrgServer();
  if (!scopeAuth.ok) redirect("/home");

  const sp = await searchParams;
  const sb = await supabaseServer();
  const admin = supabaseAdmin();
  const pc_org_id = scopeAuth.selected_pc_org_id;

  const selectedReportsTo = sp.reports_to ?? "ALL";

  // 1) Fiscal options
  const { data: fiscalRowsRaw } = await sb
    .from("metrics_raw_batch")
    .select("fiscal_end_date")
    .eq("pc_org_id", pc_org_id)
    .eq("status", "loaded");

  if (!fiscalRowsRaw || fiscalRowsRaw.length === 0) {
    return (
      <PageShell>
        <Card>No reporting batches found.</Card>
      </PageShell>
    );
  }

  const fiscalOptions = Array.from(new Set(fiscalRowsRaw.map((r: any) => String(r.fiscal_end_date)))).sort((a, b) =>
    a > b ? -1 : 1
  );

  const currentFiscal = currentFiscalEndDateISO_NY();
  const defaultFiscal = fiscalOptions.includes(currentFiscal) ? currentFiscal : fiscalOptions[0];
  const selectedFiscal = sp.fiscal ?? defaultFiscal;

  // 2) Current batch
  const currentBatch = await loadBatchMetaForFiscal(sb, pc_org_id, selectedFiscal);
  if (!currentBatch) {
    return (
      <PageShell>
        <Card>No loaded batch for selected fiscal.</Card>
      </PageShell>
    );
  }

  const latestMetricDate = currentBatch.metric_date;

  const cur = await buildRowsForBatch(sb, currentBatch.batch_id);
  const snapshotRowsAll = cur.rowsNoTotals; // ✅ for tiles + table source (no totals)

  const applyReportsTo = (arr: any[]) => {
    if (selectedReportsTo === "ALL") return arr;
    return arr.filter((r: any) => String(r.reports_to_person_id ?? "") === selectedReportsTo);
  };

  // ✅ table scope respects Reports To filter
  let filteredRows = applyReportsTo(snapshotRowsAll);

  filteredRows = filteredRows.sort((a: any, b: any) => {
    if (a.status_sort !== b.status_sort) return a.status_sort - b.status_sort;
    if (a.rank_in_pc !== b.rank_in_pc) return numOrInf(a.rank_in_pc) - numOrInf(b.rank_in_pc);
    return String(a.tech_id).localeCompare(String(b.tech_id));
  });

  const okRows = filteredRows.filter((r: any) => String(r.status_badge ?? "") === "OK");
  const nonOkRows = filteredRows.filter((r: any) => String(r.status_badge ?? "") !== "OK");

  // 3) Prior batch (same fiscal month)
  const priorBatch = await loadPriorBatchMeta(sb, pc_org_id, selectedFiscal, latestMetricDate);
  const priorMetricDate = priorBatch?.metric_date ?? null;

  const prior = priorBatch ? await buildRowsForBatch(sb, priorBatch.batch_id) : null;
  const priorSnapshotRowsAll = prior?.rowsNoTotals ?? [];

  // ✅ prior rows for per-tech deltas should respect the SAME Reports To selection
  const priorRowsScopedForDeltas = applyReportsTo(priorSnapshotRowsAll);

  const priorByTechId = new Map<string, any>();
  priorRowsScopedForDeltas.forEach((r: any) => {
    priorByTechId.set(String(r.tech_id), {
      tnps_score: r.tnps_score ?? null,
      ftr_rate: r.ftr_rate ?? null,
      tool_usage_rate: r.tool_usage_rate ?? null,
    });
  });

  // 4) Names (current snapshot only)
  const ids = new Set<string>();
  snapshotRowsAll.forEach((r: any) => {
    if (r.person_id) ids.add(String(r.person_id));
    if (r.reports_to_person_id) ids.add(String(r.reports_to_person_id));
  });

  const personNameById = new Map<string, string>();
  if (ids.size > 0) {
    const { data: people } = await admin.from("person").select("person_id, full_name").in("person_id", Array.from(ids));
    people?.forEach((p: any) => personNameById.set(String(p.person_id), p.full_name ?? "—"));
  }

  // 5) Band preset (DB)
  const presetKeys = Object.keys(GLOBAL_BAND_PRESETS);

  const { data: sel } = await admin
    .from("metrics_band_style_selection")
    .select("preset_key")
    .eq("selection_key", "GLOBAL")
    .maybeSingle();

  const activeKey = sel?.preset_key && presetKeys.includes(sel.preset_key) ? sel.preset_key : presetKeys[0] ?? "MODERN";
  const activePreset = GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  // 6) Rubric (DB)
  const { data: rubricRowsRaw } = await admin
    .from("metrics_class_kpi_rubric")
    .select("class_type,kpi_key,band_key,min_value,max_value,score_value")
    .eq("class_type", "P4P");

  const rubricRowsAll = filterEmptyRubricGroups(rubricRowsRaw ?? []);
  const distinctKeys = Array.from(new Set(rubricRowsAll.map((r: any) => String(r.kpi_key))));

  const tnpsKey = resolveRubricKey(distinctKeys, ["tnps", "nps"]) ?? "tnps_score";
  const ftrKey = resolveRubricKey(distinctKeys, ["ftr"]) ?? "ftr_rate";
  const toolKey = resolveRubricKey(distinctKeys, ["tool"]) ?? "tool_usage_rate";

  const rubricMap = buildRubricMap(rubricRowsAll);

  // 7) Optional rollup row (only when Reports To != ALL)
  const rollupRow =
    selectedReportsTo === "ALL"
      ? null
      : (() => {
          const roll = computeP4PRollup(okRows);
          const ftrVol = sumInt(okRows, "ftr_contact_jobs");
          const tuElig = sumInt(okRows, "tu_eligible_jobs");
          const tnpsSurveys = sumInt(okRows, "tnps_surveys");

          return {
            tech_id: "ROLLUP",
            person_id: null,
            reports_to_person_id: selectedReportsTo,

            metric_date: currentBatch.metric_date,
            fiscal_end_date: currentBatch.fiscal_end_date,

            weighted_score: null,
            rank_in_pc: null,

            tnps_score: roll.tnps_score ?? null,
            ftr_rate: roll.ftr_rate ?? null,
            tool_usage_rate: roll.tool_usage_rate ?? null,

            tnps_surveys: tnpsSurveys,
            ftr_contact_jobs: ftrVol,
            tu_eligible_jobs: tuElig,

            status_badge: "OK",
            status_sort: -1,
          };
        })();

  const okRowsForTable = rollupRow ? [rollupRow, ...okRows] : okRows;

  const okRowsBanded = applyBandsToRows(okRowsForTable, rubricMap, { tnpsKey, ftrKey, toolKey });
  const nonOkRowsBanded = applyBandsToRows(nonOkRows, rubricMap, { tnpsKey, ftrKey, toolKey });

  // 8) Reports To dropdown (current snapshot only)
  const reportsToMap = new Map<string, string>();
  snapshotRowsAll.forEach((r: any) => {
    if (!r.reports_to_person_id) return;
    const id = String(r.reports_to_person_id);
    const name = personNameById.get(id) ?? "—";
    reportsToMap.set(id, name);
  });

  const reportsToOptions = Array.from(reportsToMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <PageShell>
      <ReportsClientShell
        title="Reports"
        subtitle="Metrics • Stack ranking + outliers (P4P Manager)"
        preset={activePreset}
        rubricRows={rubricRowsAll}
        kpis={P4P_KPIS}
        classType="P4P"
      />

      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <FiscalSelector options={fiscalOptions} selected={selectedFiscal} />
          <ReportsFilterBar reportsToOptions={reportsToOptions} selectedReportsTo={selectedReportsTo} />
        </div>
      </Card>

      {/* ✅ Tiles always reflect FULL batch (pc org), not the Reports To slice */}
      <ReportSummaryTiles
        rows={snapshotRowsAll}
        priorRows={priorSnapshotRowsAll}
        kpis={P4P_KPIS}
        preset={activePreset}
        rubricRows={rubricRowsAll}
        rubricKeys={{ tnpsKey, ftrKey, toolKey }}
      />

      <Card>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="text-sm font-medium">Metrics (Stack Ranking)</div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            As of <span className="font-mono tabular-nums">{String(latestMetricDate)}</span>
            {priorMetricDate ? (
              <>
                <span className="px-2">•</span>
                Prior <span className="font-mono tabular-nums">{String(priorMetricDate)}</span>
              </>
            ) : null}
          </div>
        </div>

        <ReportingTable
          rows={okRowsBanded}
          showStatus={false}
          personNameById={personNameById}
          preset={activePreset}
          kpis={P4P_KPIS}
          slicerTitle="Metrics slicer"
          priorSnapshotByTechId={priorByTechId}
        />
      </Card>

      {nonOkRowsBanded.length > 0 && (
        <Card>
          <div className="text-sm font-medium mb-3">Outliers (Attention Required)</div>
          <ReportingTable
            rows={nonOkRowsBanded}
            showStatus={true}
            personNameById={personNameById}
            preset={activePreset}
            kpis={P4P_KPIS}
            slicerTitle="Outliers slicer"
            priorSnapshotByTechId={priorByTechId}
          />
        </Card>
      )}
    </PageShell>
  );
}