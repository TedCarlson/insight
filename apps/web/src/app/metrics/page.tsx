// apps/web/src/app/metrics/page.tsx
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

export default async function MetricsPage() {
  return (
    <PageShell>
      <PageHeader title="Metrics" subtitle="KPIs • Trends • Org-scoped visibility" />

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Module scaffold is live. Next step: define the initial KPI set and the read views needed per org scope.
        </p>
      </Card>
    </PageShell>
  );
}
