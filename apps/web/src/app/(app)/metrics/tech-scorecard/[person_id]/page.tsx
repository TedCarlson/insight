import { PageShell } from "@/components/ui/PageShell";

import { TechScorecardClient, getTechScorecardPayload } from "@/features/metrics/scorecard";

export default async function TechScorecardPersonPage(props: { params: Promise<{ person_id: string }> }) {
  const { person_id } = await props.params;

  const payload = await getTechScorecardPayload({ person_id });

  return (
    <PageShell>
      <div className="mb-4">
        <div className="text-xl font-semibold">Tech Scorecard</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Performance overview with weekly momentum on every KPI.
        </div>
      </div>

      <TechScorecardClient payload={payload} />
    </PageShell>
  );
}