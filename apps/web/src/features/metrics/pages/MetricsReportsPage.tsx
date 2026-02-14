import { redirect } from "next/navigation";
import Link from "next/link";

import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";

import FiscalSelector from "@/features/metrics/components/FiscalSelector";
import ReportsFilterBar from "@/features/metrics/components/reports/ReportsFilterBar";

import { ReportingTable } from "@/features/metrics/components/reports/ReportingTable";

import { numOrInf } from "@/features/metrics/lib/reports/format";
import {
  resolveRubricKey,
  buildRubricMap,
  applyBandsToRows,
} from "@/features/metrics/lib/reports/rubric";

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

  // day >= 22 => fiscal ends on 21 of next month
  let endYear = year;
  let endMonth = month;

  if (day >= 22) {
    endMonth = month + 1;
    if (endMonth === 13) {
      endMonth = 1;
      endYear = year + 1;
    }
  }

  const mm = String(endMonth).padStart(2, "0");
  return `${endYear}-${mm}-21`;
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

  const { data: rows } = await sb
    .from("metrics_p4p_manager_view_v")
    .select("*")
    .eq("pc_org_id", pc_org_id);

  if (!rows || rows.length === 0) {
    return (
      <PageShell>
        <Card variant="subtle">
          <Toolbar
            left={
              <div className="min-w-0 flex items-center gap-2">
                <Link
                  href="/metrics"
                  className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
                >
                  Back
                </Link>

                <span className="px-2 text-[var(--to-ink-muted)]">•</span>

                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5">Reports</div>
                  <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
                    Metrics • Stack ranking + Outliers
                  </div>
                </div>
              </div>
            }
            right={
              <Link href="/metrics/rubric" className="text-sm underline">
                Rubric &amp; Band Styles
              </Link>
            }
          />
        </Card>

        <Card>No reporting rows found.</Card>
      </PageShell>
    );
  }

  const fiscalOptions = Array.from(new Set(rows.map((r) => r.fiscal_end_date))).sort(
    (a, b) => (a > b ? -1 : 1)
  );

  // default fiscal = current fiscal month if present, else latest
  const currentFiscal = currentFiscalEndDateISO_NY();
  const defaultFiscal = fiscalOptions.includes(currentFiscal)
    ? currentFiscal
    : fiscalOptions[0];

  const selectedFiscal = sp.fiscal ?? defaultFiscal;

  const fiscalRows = rows.filter((r) => r.fiscal_end_date === selectedFiscal);

  const latestMetricDate = fiscalRows
    .map((r) => r.metric_date)
    .sort((a, b) => (a > b ? -1 : 1))[0];

  const snapshotRows = fiscalRows.filter((r) => r.metric_date === latestMetricDate);

  let filteredRows = snapshotRows.sort((a, b) => {
    if (a.status_sort !== b.status_sort) return a.status_sort - b.status_sort;
    if (a.rank_in_pc !== b.rank_in_pc)
      return numOrInf(a.rank_in_pc) - numOrInf(b.rank_in_pc);
    return String(a.tech_id).localeCompare(String(b.tech_id));
  });

  // reports_to filter
  if (selectedReportsTo !== "ALL") {
    filteredRows = filteredRows.filter(
      (r) => String(r.reports_to_person_id ?? "") === selectedReportsTo
    );
  }

  const okRows = filteredRows.filter((r) => r.status_badge === "OK");
  const nonOkRows = filteredRows.filter((r) => r.status_badge !== "OK");

  // names (for snapshot only)
  const ids = new Set<string>();
  snapshotRows.forEach((r) => {
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

  // band preset selection (DB)
  const presetKeys = Object.keys(GLOBAL_BAND_PRESETS);

  const { data: sel } = await admin
    .from("metrics_band_style_selection")
    .select("preset_key,selection_key")
    .eq("selection_key", "GLOBAL")
    .maybeSingle();

  const activeKey =
    sel?.preset_key && presetKeys.includes(sel.preset_key)
      ? sel.preset_key
      : presetKeys[0] ?? "MODERN";

  const activePreset =
    GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  // rubric (DB)
  const { data: rubricRowsRaw } = await admin
    .from("metrics_class_kpi_rubric")
    .select("class_type,kpi_key,band_key,min_value,max_value,score_value")
    .eq("class_type", "P4P");

  const rubricRowsAll = rubricRowsRaw ?? [];
  const distinctKeys = Array.from(
    new Set(rubricRowsAll.map((r: any) => String(r.kpi_key)))
  );

  const tnpsKey = resolveRubricKey(distinctKeys, ["tnps", "nps"]);
  const ftrKey = resolveRubricKey(distinctKeys, ["ftr"]);
  const toolKey = resolveRubricKey(distinctKeys, ["tool"]);

  const rubricMap = buildRubricMap(rubricRowsAll);

  const okRowsBanded = applyBandsToRows(okRows, rubricMap, { tnpsKey, ftrKey, toolKey });
  const nonOkRowsBanded = applyBandsToRows(nonOkRows, rubricMap, {
    tnpsKey,
    ftrKey,
    toolKey,
  });

  // Reports To dropdown options (from snapshot, so list stays tight)
  const reportsToMap = new Map<string, string>();
  snapshotRows.forEach((r) => {
    if (!r.reports_to_person_id) return;
    const id = String(r.reports_to_person_id);
    const name = personNameById.get(id) ?? "—";
    reportsToMap.set(id, name);
  });

  const reportsToOptions = Array.from(reportsToMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  return (
    <PageShell>
      {/* Uploads-style header */}
      <Card variant="subtle">
        <Toolbar
          left={
            <div className="min-w-0 flex items-center gap-2">
              <Link
                href="/metrics"
                className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
              >
                Back
              </Link>

              <span className="px-2 text-[var(--to-ink-muted)]">•</span>

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5">Reports</div>
                <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
                  Metrics • Stack ranking + Outliers
                </div>
              </div>
            </div>
          }
          right={
            <Link href="/metrics/rubric" className="text-sm underline">
              Rubric &amp; Band Styles
            </Link>
          }
        />
      </Card>

      {/* Filters row (same card as before, just tighter, like app surfaces) */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <FiscalSelector options={fiscalOptions} selected={selectedFiscal} />
            <ReportsFilterBar
              reportsToOptions={reportsToOptions}
              selectedReportsTo={selectedReportsTo}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium mb-3">Metrics (Stack Ranking)</div>
        <ReportingTable
          rows={okRowsBanded}
          showStatus={false}
          personNameById={personNameById}
          preset={activePreset}
          kpis={P4P_KPIS}
          slicerTitle="Metrics slicer"
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
          />
        </Card>
      )}
    </PageShell>
  );
}