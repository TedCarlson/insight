import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import ScoreSummaryTable from "@/features/metrics/components/ScoreSummaryTable";
import ScoreKpiBreakdownTable from "@/features/metrics/components/ScoreKpiBreakdownTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  class?: string;
  entity_type?: string;
  fiscal?: string;
};

export default async function MetricsReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sp = await searchParams;

  const classType = (sp.class ?? "P4P").toUpperCase();
  const entityType = (sp.entity_type ?? "TECH").toUpperCase();
  const fiscal = sp.fiscal ?? "";

  if (!fiscal) {
    return (
      <PageShell>
        <PageHeader
          title="Metrics Reports (Preview)"
          subtitle="Hydrated output from score tables (scoped to selected org)."
        />
        <Card>
          <div className="text-sm text-[var(--to-ink-muted)]">
            Missing <span className="font-medium text-[var(--to-ink)]">fiscal</span> query param.
            <div className="mt-2 text-xs">
              Example:{" "}
              <span className="font-medium">
                /metrics/reports?class=P4P&entity_type=TECH&fiscal=2026-01-21
              </span>
            </div>
          </div>
        </Card>
      </PageShell>
    );
  }

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  // Summary (scoped by pc_org_id)
  const { data: summary, error: summaryErr } = await sb
    .from("score_summary")
    .select("*")
    .eq("pc_org_id", pc_org_id)
    .eq("class_type", classType)
    .eq("entity_type", entityType)
    .eq("fiscal_end_date", fiscal)
    .order("overall_rank", { ascending: true });

  if (summaryErr) {
    return (
      <PageShell>
        <PageHeader
          title="Metrics Reports (Preview)"
          subtitle={`Org scoped: ${pc_org_id} • ${classType} • ${entityType} • ${fiscal}`}
        />
        <Card>
          <div className="text-sm text-red-600">Failed to load score_summary.</div>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(summaryErr, null, 2)}</pre>
        </Card>
      </PageShell>
    );
  }

  const summaryRows = summary ?? [];
  const selectedEntityId = summaryRows[0]?.entity_id ?? null;

  // KPI breakdown for first entity (scoped by pc_org_id)
  const { data: kpiRows, error: kpiErr } = selectedEntityId
    ? await sb
        .from("score_kpi")
        .select("*")
        .eq("pc_org_id", pc_org_id)
        .eq("class_type", classType)
        .eq("entity_type", entityType)
        .eq("fiscal_end_date", fiscal)
        .eq("entity_id", selectedEntityId)
        .order("kpi_key", { ascending: true })
    : { data: [], error: null };

  return (
    <PageShell>
      <PageHeader
        title="Metrics Reports (Preview)"
        subtitle={`Org scoped: ${pc_org_id} • ${classType} • ${entityType} • ${fiscal}`}
      />

      <div className="grid gap-4">
        <Card>
          <div className="text-sm font-medium">Score Summary</div>
          <div className="mt-3">
            <ScoreSummaryTable rows={summaryRows} />
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium">KPI Breakdown</div>
          <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
            Showing first entity in scope (until we add selector UI).
          </div>

          <div className="mt-3">
            {!selectedEntityId ? (
              <div className="text-sm text-[var(--to-ink-muted)]">No entities found for this selection.</div>
            ) : kpiErr ? (
              <div className="text-sm text-red-600">Failed to load score_kpi rows.</div>
            ) : (
              <ScoreKpiBreakdownTable rows={kpiRows ?? []} />
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}