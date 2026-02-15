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
  // Defensive: if the view ever returns multiple rows per tech within a snapshot,
  // keep the “best” one deterministically so UI does not duplicate / key-collide.
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
    .from("metrics_p4p_manager_view_v")
    .select("fiscal_end_date")
    .eq("pc_org_id", pc_org_id);

  if (!fiscalRowsRaw || fiscalRowsRaw.length === 0) {
    return (
      <PageShell>
        <Card>No reporting rows found.</Card>
      </PageShell>
    );
  }

  const fiscalOptions = Array.from(new Set(fiscalRowsRaw.map((r: any) => r.fiscal_end_date))).sort((a, b) =>
    a > b ? -1 : 1
  );

  const currentFiscal = currentFiscalEndDateISO_NY();
  const defaultFiscal = fiscalOptions.includes(currentFiscal) ? currentFiscal : fiscalOptions[0];
  const selectedFiscal = sp.fiscal ?? defaultFiscal;

  // -----------------------------
  // 2) Current fiscal dataset ONLY
  //    (table + filters live here)
  // -----------------------------
  const { data: fiscalRows } = await sb
    .from("metrics_p4p_manager_view_v")
    .select("*")
    .eq("pc_org_id", pc_org_id)
    .eq("fiscal_end_date", selectedFiscal);

  if (!fiscalRows || fiscalRows.length === 0) {
    return (
      <PageShell>
        <Card>No reporting rows for selected fiscal.</Card>
      </PageShell>
    );
  }

  // Latest metric_date inside selected fiscal
  const metricDatesDesc = Array.from(new Set(fiscalRows.map((r: any) => r.metric_date))).sort((a, b) =>
    a > b ? -1 : 1
  );

  const latestMetricDate = metricDatesDesc[0];

  // Current snapshot rows (STRICTLY fiscal-scoped)
  const snapshotRowsRaw = fiscalRows.filter((r: any) => r.metric_date === latestMetricDate);
  const snapshotRows = dedupeByTechId(snapshotRowsRaw);

  const applyReportsTo = (arr: any[]) => {
    if (selectedReportsTo === "ALL") return arr;
    return arr.filter((r: any) => String(r.reports_to_person_id ?? "") === selectedReportsTo);
  };

  let filteredRows = applyReportsTo(snapshotRows);

  filteredRows = filteredRows.sort((a: any, b: any) => {
    if (a.status_sort !== b.status_sort) return a.status_sort - b.status_sort;
    if (a.rank_in_pc !== b.rank_in_pc) return numOrInf(a.rank_in_pc) - numOrInf(b.rank_in_pc);
    return String(a.tech_id).localeCompare(String(b.tech_id));
  });

  const okRows = filteredRows.filter((r: any) => r.status_badge === "OK");
  const nonOkRows = filteredRows.filter((r: any) => r.status_badge !== "OK");

  // -----------------------------
  // 3) Prior snapshot (FISCAL-AGNOSTIC)
  //    used ONLY for deltas + arrows
  // -----------------------------
  const { data: priorDateRows } = await sb
    .from("metrics_p4p_manager_view_v")
    .select("metric_date")
    .eq("pc_org_id", pc_org_id)
    .lt("metric_date", latestMetricDate)
    .order("metric_date", { ascending: false })
    .limit(1);

  const priorMetricDate = priorDateRows && priorDateRows.length > 0 ? priorDateRows[0].metric_date : null;

  const priorSnapshotRowsRaw = priorMetricDate
    ? (
        await sb
          .from("metrics_p4p_manager_view_v")
          .select("*")
          .eq("pc_org_id", pc_org_id)
          .eq("metric_date", priorMetricDate)
      ).data ?? []
    : [];

  const priorSnapshotRows = dedupeByTechId(priorSnapshotRowsRaw);
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
    const { data: people } = await admin.from("person").select("person_id, full_name").in("person_id", Array.from(ids));

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

  const activeKey =
    sel?.preset_key && presetKeys.includes(sel.preset_key) ? sel.preset_key : presetKeys[0] ?? "MODERN";

  const activePreset = GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  // -----------------------------
  // 6) Rubric (DB) — constant across time
  // -----------------------------
  const { data: rubricRowsRaw } = await admin
    .from("metrics_class_kpi_rubric")
    .select("class_type,kpi_key,band_key,min_value,max_value,score_value")
    .eq("class_type", "P4P");

  // ✅ Drop KPI groups where all rows are empty
  const rubricRowsAll = filterEmptyRubricGroups(rubricRowsRaw ?? []);

  const distinctKeys = Array.from(new Set(rubricRowsAll.map((r: any) => String(r.kpi_key))));

  // ✅ resolveRubricKey can be null; provide safe fallbacks so types stay clean
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
      {/* ✅ Back to /metrics + ✅ Rubric overlay button (not link) */}
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