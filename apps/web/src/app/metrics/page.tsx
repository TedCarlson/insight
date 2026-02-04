// apps/web/src/app/metrics/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseServer } from "@/lib/supabase/server";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SectionCard({ title, href }: { title: string; href: string }) {
  return (
    <Card>
      <Link href={href} className={cls("to-btn", "to-btn--secondary", "px-4", "py-3", "w-full", "text-center")}>
        {title}
      </Link>
    </Card>
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MetricsHomePage() {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) redirect("/home");

  const sb = await supabaseServer();
  const pc_org_id = scope.selected_pc_org_id;

  const { data: latestBatch } = await sb
    .from("metrics_raw_batch")
    .select("batch_id, fiscal_end_date, row_count, uploaded_at, status")
    .eq("pc_org_id", pc_org_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <PageShell>
      <PageHeader title="Metrics" subtitle="Upload raw reports and derive weighted scores/ranks (Phase 2)." />

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Uploads" href="/metrics/uploads" />
        <SectionCard title="Scorecards (coming soon)" href="/metrics" />
      </div>

      <Card>
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Latest upload evidence</div>

          <div className="text-sm text-[var(--to-ink-muted)]">
            Org: <span className="font-medium text-[var(--to-ink)]">{pc_org_id}</span>
            {" • "}
            Latest batch:{" "}
            {latestBatch ? (
              <>
                <span className="font-medium text-[var(--to-ink)]">{latestBatch.status}</span>
                {" • "}
                FM end: <span className="font-medium text-[var(--to-ink)]">{latestBatch.fiscal_end_date}</span>
                {" • "}
                Rows: <span className="font-medium text-[var(--to-ink)]">{latestBatch.row_count}</span>
                {" • "}
                {new Date(latestBatch.uploaded_at).toLocaleString()}
              </>
            ) : (
              <span className="font-medium text-[var(--to-ink)]">No uploads yet</span>
            )}
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            This page is the landing hub. Use <span className="font-medium">Uploads</span> to stage/verify and load raw reports.
          </div>
        </div>
      </Card>
    </PageShell>
  );
}