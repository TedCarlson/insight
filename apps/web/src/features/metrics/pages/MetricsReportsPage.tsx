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

type UiMasterMetricRow = {
  batch_id: string | null;
  class_type: string | null;
  pc_org_id: string | null;
  metric_date: string | null;
  fiscal_end_date: string | null;

  tech_id: string | null;
  person_id: string | null;

  ownership_mode: string | null;
  direct_reports_to_person_id: string | null;

  composite_score: number | null; // DB truth (lower is better)
  rank_org: number | null; // DB truth (1 is best)
  population_size: number | null;

  is_totals: boolean | null;

  metrics_json: unknown | null;
  created_at: string | null;
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

function pickStatusBadge(s: { is_totals?: boolean | null; ownership_mode?: string | null; composite_score?: number | null }) {
  if (s.is_totals) return { status_badge: "TOTALS", status_sort: 999 };

  // only ACTIVE may be OK; everything else is UNLINKED
  if (String(s.ownership_mode ?? "") !== "ACTIVE") return { status_badge: "UNLINKED", status_sort: 50 };
  if (s.composite_score == null) return { status_badge: "UNLINKED", status_sort: 50 };

  return { status_badge: "OK", status_sort: 10 };
}

function metricNum(metricsJson: unknown, key: string): number | null {
  if (!metricsJson || typeof metricsJson !== "object") return null;
  const v = (metricsJson as Record<string, unknown>)[key];
  if (v == null) return null;

  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  // handle numeric strings
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function loadBatchMetaForFiscal(sb: any, pc_org_id: string, fiscal_end_date: string): Promise<BatchMeta | null> {
  const { data, error } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, metric_date, fiscal_end_date, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_end_date", fiscal_end_date)
    .eq("status", "loaded")
    .order("metric_date", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[P4P REPORT] metrics_raw_batch current batch error", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      pc_org_id,
      fiscal_end_date,
    });
  }

  const row = data?.[0];
  if (!row?.batch_id) return null;

  return {
    batch_id: String(row.batch_id),
    metric_date: String(row.metric_date),
    fiscal_end_date: String(row.fiscal_end_date),
  };
}

async function loadPriorBatchMetaSameFiscal(sb: any, pc_org_id: string, fiscal_end_date: string, before_metric_date: string): Promise<BatchMeta | null> {
  const { data, error } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, metric_date, fiscal_end_date, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_end_date", fiscal_end_date)
    .eq("status", "loaded")
    .lt("metric_date", before_metric_date)
    .order("metric_date", { ascending: false })
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[P4P REPORT] metrics_raw_batch prior batch error", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      pc_org_id,
      fiscal_end_date,
      before_metric_date,
    });
  }

  const row = data?.[0];
  if (!row?.batch_id) return null;

  return {
    batch_id: String(row.batch_id),
    metric_date: String(row.metric_date),
    fiscal_end_date: String(row.fiscal_end_date),
  };
}

async function loadRowsForBatchFromView(sb: any, pc_org_id: string, batch_id: string): Promise<any[]> {
  const { data, error } = await sb
    .from("ui_master_metric_v")
    .select(
      [
        "batch_id",
        "class_type",
        "pc_org_id",
        "metric_date",
        "fiscal_end_date",
        "tech_id",
        "person_id",
        "ownership_mode",
        "direct_reports_to_person_id",
        "composite_score",
        "rank_org",
        "population_size",
        "is_totals",
        "metrics_json",
        "created_at",
      ].join(",")
    )
    .eq("pc_org_id", pc_org_id)
    .eq("class_type", "P4P")
    .eq("batch_id", batch_id);

  if (error) {
    console.error("[P4P REPORT] ui_master_metric_v rows error", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      pc_org_id,
      batch_id,
    });
  }

  const rows = (data ?? []) as UiMasterMetricRow[];

  const out: any[] = [];
  for (const r of rows) {
    const tech_id = String(r.tech_id ?? "");
    if (!tech_id) continue;

    const is_totals = Boolean(r.is_totals);
    if (is_totals) continue;

    const badge = pickStatusBadge({
      is_totals,
      ownership_mode: r.ownership_mode ?? null,
      composite_score: r.composite_score ?? null,
    });

    const mj = r.metrics_json ?? {};

    out.push({
      // identity
      tech_id,
      person_id: r.person_id ?? null,
      reports_to_person_id: r.direct_reports_to_person_id ?? null,

      // snapshot
      ownership_mode: r.ownership_mode ?? null,
      metric_date: r.metric_date ?? null,
      fiscal_end_date: r.fiscal_end_date ?? null,

      // ranking (DB truth)
      weighted_score: r.composite_score ?? null, // lower is better
      rank_in_pc: r.rank_org ?? null, // 1 is best
      population_size: r.population_size ?? null,

      // KPI values (support canonical or legacy)
      tnps_score: metricNum(mj, "tnps_score") ?? metricNum(mj, "tNPS Rate"),
      ftr_rate: metricNum(mj, "ftr_rate") ?? metricNum(mj, "FTR%"),
      tool_usage_rate: metricNum(mj, "tool_usage_rate") ?? metricNum(mj, "ToolUsage"),

      // Volume / mix (raw keys in metrics_json)
      total_jobs: metricNum(mj, "Total Jobs"),
      installs: metricNum(mj, "Installs"),
      sros: metricNum(mj, "SROs"),
      tcs: metricNum(mj, "TCs"),

      // Denominators (raw keys)
      total_ftr_contact_jobs: metricNum(mj, "Total FTR/Contact Jobs"),
      tnps_surveys: metricNum(mj, "tNPS Surveys"),
      tu_eligible_jobs: metricNum(mj, "TUEligibleJobs"),

      // misc
      job_volume_band: null,
      status_badge: badge.status_badge,
      status_sort: badge.status_sort,
    });
  }

  return dedupeByTechId(out);
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
  const { data: fiscalRowsRaw, error: fiscalErr } = await sb
    .from("metrics_raw_batch")
    .select("fiscal_end_date")
    .eq("pc_org_id", pc_org_id)
    .eq("status", "loaded");

  if (fiscalErr) {
    console.error("[P4P REPORT] metrics_raw_batch fiscal options error", {
      message: (fiscalErr as any)?.message,
      details: (fiscalErr as any)?.details,
      hint: (fiscalErr as any)?.hint,
      code: (fiscalErr as any)?.code,
      pc_org_id,
    });
  }

  const fiscalOptions = Array.from(new Set((fiscalRowsRaw ?? []).map((r: any) => String(r.fiscal_end_date)))).sort((a, b) =>
    a > b ? -1 : 1
  );

  if (fiscalOptions.length === 0) {
    return (
      <PageShell>
        <Card>No reporting batches found.</Card>
      </PageShell>
    );
  }

  const currentFiscal = currentFiscalEndDateISO_NY();
  const defaultFiscal = fiscalOptions.includes(currentFiscal) ? currentFiscal : fiscalOptions[0];
  const selectedFiscal = sp.fiscal ?? defaultFiscal;

  // 2) Current batch
  const currentBatch = await loadBatchMetaForFiscal(sb, pc_org_id, selectedFiscal);
  if (!currentBatch) {
    return (
      <PageShell>
        <Card>No reportable batch found for selected fiscal (P4P).</Card>
      </PageShell>
    );
  }

  const latestMetricDate = currentBatch.metric_date;

  // Current snapshot rows
  const snapshotRows = await loadRowsForBatchFromView(sb, pc_org_id, currentBatch.batch_id);

  const applyReportsTo = (arr: any[]) => {
    if (selectedReportsTo === "ALL") return arr;
    return arr.filter((r: any) => String(r.reports_to_person_id ?? "") === selectedReportsTo);
  };

  let filteredRows = applyReportsTo(snapshotRows);

  // ✅ Sort primary surface by DB rank (1 = best), then tech_id as stable tie-breaker
  filteredRows = filteredRows.sort((a: any, b: any) => {
    if (a.status_sort !== b.status_sort) return a.status_sort - b.status_sort;

    const ar = numOrInf(a.rank_in_pc);
    const br = numOrInf(b.rank_in_pc);
    if (ar !== br) return ar - br;

    return String(a.tech_id).localeCompare(String(b.tech_id));
  });

  const okRows = filteredRows.filter((r: any) => r.status_badge === "OK");
  const nonOkRows = filteredRows.filter((r: any) => r.status_badge !== "OK");

  // 3) Prior batch (same fiscal)
  const priorBatch = await loadPriorBatchMetaSameFiscal(sb, pc_org_id, selectedFiscal, latestMetricDate);
  const priorMetricDate = priorBatch?.metric_date ?? null;

  const priorSnapshotRows = priorBatch ? await loadRowsForBatchFromView(sb, pc_org_id, priorBatch.batch_id) : [];
  const priorRowsScoped = applyReportsTo(priorSnapshotRows);

  const priorByTechId = new Map<string, any>();
  priorRowsScoped.forEach((r: any) => {
    priorByTechId.set(String(r.tech_id), {
      tnps_score: r.tnps_score ?? null,
      ftr_rate: r.ftr_rate ?? null,
      tool_usage_rate: r.tool_usage_rate ?? null,
    });
  });

  // 4) Names (current snapshot only)
  const ids = new Set<string>();
  snapshotRows.forEach((r: any) => {
    if (r.person_id) ids.add(String(r.person_id));
    if (r.reports_to_person_id) ids.add(String(r.reports_to_person_id));
  });

  const personNameById = new Map<string, string>();
  if (ids.size > 0) {
    const { data: people } = await admin.from("person").select("person_id, full_name").in("person_id", Array.from(ids));
    people?.forEach((p: any) => {
      personNameById.set(String(p.person_id), p.full_name ?? "—");
    });
  }

  // 5) Band preset
  const presetKeys = Object.keys(GLOBAL_BAND_PRESETS);
  const { data: sel } = await admin.from("metrics_band_style_selection").select("preset_key").eq("selection_key", "GLOBAL").maybeSingle();
  const activeKey = sel?.preset_key && presetKeys.includes(sel.preset_key) ? sel.preset_key : presetKeys[0] ?? "MODERN";
  const activePreset = GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  // 6) Rubric
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

  const okRowsBanded = applyBandsToRows(okRows, rubricMap, { tnpsKey, ftrKey, toolKey });
  const nonOkRowsBanded = applyBandsToRows(nonOkRows, rubricMap, { tnpsKey, ftrKey, toolKey });

  // 7) Reports To dropdown (current snapshot only)
  const reportsToMap = new Map<string, string>();
  snapshotRows.forEach((r: any) => {
    if (!r.reports_to_person_id) return;
    const id = String(r.reports_to_person_id);
    const name = personNameById.get(id) ?? "—";
    reportsToMap.set(id, name);
  });

  const reportsToOptions = Array.from(reportsToMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <PageShell>
      <ReportsClientShell title="Reports" subtitle="Metrics • Stack ranking + outliers (P4P Manager)" preset={activePreset} rubricRows={rubricRowsAll} kpis={P4P_KPIS} classType="P4P" />

      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <FiscalSelector options={fiscalOptions} selected={selectedFiscal} />
          <ReportsFilterBar reportsToOptions={reportsToOptions} selectedReportsTo={selectedReportsTo} />
        </div>
      </Card>

      <ReportSummaryTiles rows={filteredRows} priorRows={priorRowsScoped} kpis={P4P_KPIS} preset={activePreset} rubricRows={rubricRowsAll} rubricKeys={{ tnpsKey, ftrKey, toolKey }} />

      <Card>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="text-sm font-medium">Metrics (Stack Ranking) • Tech count {okRowsBanded.length}</div>

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

      <Card>
        <div className="text-sm font-medium mb-3">Outliers (Attention Required) • Tech count {nonOkRowsBanded.length}</div>
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
    </PageShell>
  );
}