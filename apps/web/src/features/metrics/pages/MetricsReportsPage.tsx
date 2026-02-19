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
  // Defensive: if multiple rows ever show up per tech, keep the “best” deterministically.
  const by = new Map<string, any>();
  for (const r of rows) {
    const k = String(r.tech_id ?? "");
    const prev = by.get(k);
    if (!prev) {
      by.set(k, r);
      continue;
    }

    // Prefer OK over non-OK; then lower rank; then stable fallback.
    const prevOk = String(prev.status_badge ?? "") === "OK";
    const curOk = String(r.status_badge ?? "") === "OK";
    if (curOk && !prevOk) {
      by.set(k, r);
      continue;
    }
    if (curOk === prevOk) {
      const pr = numOrInf(prev.rank_in_pc);
      const cr = numOrInf(r.rank_in_pc);
      if (cr < pr) {
        by.set(k, r);
        continue;
      }
    }
  }
  return Array.from(by.values());
}

function isRubricRowMeaningful(r: any) {
  // “Meaningful” = at least one of min/max/score is present.
  return r?.min_value != null || r?.max_value != null || r?.score_value != null;
}

function filterEmptyRubricGroups(rows: any[]) {
  // Drops KPI groups where ALL rows are empty (min/max/score all null)
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

function pickStatusBadge(s: {
  is_totals?: boolean | null;
  ownership_mode?: string | null;
  composite_score?: number | null;
}): { status_badge: string; status_sort: number } {
  if (s.is_totals) return { status_badge: "TOTALS", status_sort: 999 };
  if (String(s.ownership_mode ?? "") === "ORPHAN_OUT_OF_WINDOW") return { status_badge: "OUTLIER", status_sort: 50 };
  if (s.composite_score == null) return { status_badge: "OUTLIER", status_sort: 50 };
  return { status_badge: "OK", status_sort: 10 };
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

async function loadPriorBatchMeta(sb: any, pc_org_id: string, before_metric_date: string): Promise<BatchMeta | null> {
  const { data } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, metric_date, fiscal_end_date, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
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

async function buildRowsForBatch(sb: any, batch_id: string, class_type: "P4P" = "P4P") {
  const [{ data: snap }, { data: metrics }] = await Promise.all([
    sb
      .from("master_kpi_archive_snapshot")
      .select(
        "batch_id,class_type,pc_org_id,metric_date,fiscal_end_date,tech_id,person_id,ownership_mode,direct_reports_to_person_id,is_totals,composite_score,rank_org,population_size"
      )
      .eq("batch_id", batch_id)
      .eq("class_type", class_type),
    sb
      .from("master_kpi_archive_metric")
      .select("tech_id,metric_key_canonical,computed_value,raw_value")
      .eq("batch_id", batch_id)
      .eq("class_type", class_type),
  ]);

  const metricByTech = new Map<string, Record<string, number | null>>();
  for (const m of metrics ?? []) {
    const tech = String((m as any).tech_id ?? "");
    const key = String((m as any).metric_key_canonical ?? "");
    if (!tech || !key) continue;

    const v = (m as any).computed_value ?? (m as any).raw_value ?? null;
    const num = v == null ? null : Number(v);

    const obj = metricByTech.get(tech) ?? {};
    obj[key] = Number.isFinite(num as any) ? (num as number) : null;
    metricByTech.set(tech, obj);
  }

  const out: any[] = [];
  for (const s of snap ?? []) {
    const tech_id = String((s as any).tech_id ?? "");
    const is_totals = Boolean((s as any).is_totals);

    // We keep totals in the archive, but do NOT show them in the report UI.
    if (is_totals) continue;

    const m = metricByTech.get(tech_id) ?? {};
    const badge = pickStatusBadge({
      is_totals,
      ownership_mode: (s as any).ownership_mode ?? null,
      composite_score: (s as any).composite_score ?? null,
    });

    out.push({
      // identity
      tech_id,
      person_id: (s as any).person_id ?? null,
      reports_to_person_id: (s as any).direct_reports_to_person_id ?? null,

      // snapshot
      ownership_mode: (s as any).ownership_mode ?? null,
      metric_date: (s as any).metric_date ?? null,
      fiscal_end_date: (s as any).fiscal_end_date ?? null,

      // ranking
      weighted_score: (s as any).composite_score ?? null,
      rank_in_pc: (s as any).rank_org ?? null,
      population_size: (s as any).population_size ?? null,

      // KPIs used by rubric + pills
      tnps_score: (m as any).tnps_score ?? null,
      ftr_rate: (m as any).ftr_rate ?? null,
      tool_usage_rate: (m as any).tool_usage_rate ?? null,

      // denominators for weighted rollups + volume column
      tnps_surveys: (m as any).tnps_surveys ?? null,
      ftr_contact_jobs:
        (m as any).ftr_contact_jobs ??
        // in case canonical uses different naming
        (m as any).total_ftr_contact_jobs ??
        (m as any).total_ftr_contact_jobs_count ??
        null,
      tu_eligible_jobs: (m as any).tu_eligible_jobs ?? null,

      // misc (table expects these)
      job_volume_band: null,
      status_badge: badge.status_badge,
      status_sort: badge.status_sort,
    });
  }

  return dedupeByTechId(out);
}

export default async function MetricsReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const scopeAuth = await requireSelectedPcOrgServer();
  if (!scopeAuth.ok) redirect("/home");

  const sp = await searchParams;
  const sb = await supabaseServer();
  const admin = supabaseAdmin();
  const pc_org_id = scopeAuth.selected_pc_org_id;

  const selectedReportsTo = sp.reports_to ?? "ALL";

  // -----------------------------
  // 1) Fiscal options (cheap)
  // -----------------------------
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

  // -----------------------------
  // 2) Current batch for selected fiscal
  // -----------------------------
  const currentBatch = await loadBatchMetaForFiscal(sb, pc_org_id, selectedFiscal);
  if (!currentBatch) {
    return (
      <PageShell>
        <Card>No loaded batch for selected fiscal.</Card>
      </PageShell>
    );
  }

  const latestMetricDate = currentBatch.metric_date;
  const snapshotRows = await buildRowsForBatch(sb, currentBatch.batch_id, "P4P");

  const applyReportsTo = (arr: any[]) => {
    if (selectedReportsTo === "ALL") return arr;
    return arr.filter((r: any) => String(r.reports_to_person_id ?? "") === selectedReportsTo);
  };

  let filteredRows = applyReportsTo(snapshotRows);

  // ✅ Include outliers in the slice for sanity checks.
  // (Totals rows are excluded from the UI + from rollups.)
  filteredRows = filteredRows.sort((a: any, b: any) => {
    if (a.status_sort !== b.status_sort) return a.status_sort - b.status_sort;
    if (a.rank_in_pc !== b.rank_in_pc) return numOrInf(a.rank_in_pc) - numOrInf(b.rank_in_pc);
    return String(a.tech_id).localeCompare(String(b.tech_id));
  });

  const okRows = filteredRows.filter((r: any) => r.status_badge === "OK");
  const nonOkRows = filteredRows.filter((r: any) => r.status_badge !== "OK");

  // -----------------------------
  // 3) Prior batch (fiscal-agnostic)
  // -----------------------------
  const priorBatch = await loadPriorBatchMeta(sb, pc_org_id, latestMetricDate);
  const priorMetricDate = priorBatch?.metric_date ?? null;

  const priorSnapshotRows = priorBatch ? await buildRowsForBatch(sb, priorBatch.batch_id, "P4P") : [];
  const priorRowsScoped = applyReportsTo(priorSnapshotRows);

  // Prior map for KPI pill arrows in the table
  const priorByTechId = new Map<string, any>();
  priorRowsScoped.forEach((r: any) => {
    priorByTechId.set(String(r.tech_id), {
      tnps_score: r.tnps_score ?? null,
      ftr_rate: r.ftr_rate ?? null,
      tool_usage_rate: r.tool_usage_rate ?? null,
    });
  });

  // -----------------------------
  // 4) Names (current snapshot only)
  // -----------------------------
  const ids = new Set<string>();
  snapshotRows.forEach((r: any) => {
    if (r.person_id) ids.add(String(r.person_id));
    if (r.reports_to_person_id) ids.add(String(r.reports_to_person_id));
  });

  const personNameById = new Map<string, string>();
  if (ids.size > 0) {
    const { data: people } = await admin
      .from("person")
      .select("person_id, full_name")
      .in("person_id", Array.from(ids));

    people?.forEach((p: any) => {
      personNameById.set(String(p.person_id), p.full_name ?? "—");
    });
  }

  // -----------------------------
  // 5) Band preset (DB)
  // -----------------------------
  const presetKeys = Object.keys(GLOBAL_BAND_PRESETS);

  const { data: sel } = await admin
    .from("metrics_band_style_selection")
    .select("preset_key")
    .eq("selection_key", "GLOBAL")
    .maybeSingle();

  const activeKey = sel?.preset_key && presetKeys.includes(sel.preset_key) ? sel.preset_key : presetKeys[0] ?? "MODERN";

  const activePreset = GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  // -----------------------------
  // 6) Rubric (DB) — constant across time
  // -----------------------------
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

  // -----------------------------
  // 7) Reports To dropdown (current snapshot only)
  // -----------------------------
  const reportsToMap = new Map<string, string>();
  snapshotRows.forEach((r: any) => {
    if (!r.reports_to_person_id) return;
    const id = String(r.reports_to_person_id);
    const name = personNameById.get(id) ?? "—";
    reportsToMap.set(id, name);
  });

  const reportsToOptions = Array.from(reportsToMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  // -----------------------------
  // Render
  // -----------------------------
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

      <ReportSummaryTiles
        rows={filteredRows}
        priorRows={priorRowsScoped}
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