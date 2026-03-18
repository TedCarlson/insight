import TechSurfaceHeader from "@/features/tech/shared/components/TechSurfaceHeader";
import { getTechWhoAmI } from "@/features/tech/shared/lib/getTechWhoAmI";
import TechMetricsClient from "@/features/tech/metrics/components/TechMetricsClient";
import { getTechScorecardPayload } from "@/features/metrics/scorecard/lib/getTechScorecardPayload.server";
import { getTechShellContext } from "@/features/tech/lib/getTechShellContext";

type RangeKey = "FM" | "3FM" | "12FM";

export default async function TechMetricsFeaturePage(props: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const [who, shell] = await Promise.all([
    getTechWhoAmI(),
    getTechShellContext(),
  ]);

  const sp = (await props.searchParams) ?? {};
  const rawRange = String(sp.range ?? "FM").toUpperCase();
  const range: RangeKey =
    rawRange === "3FM" ? "3FM" : rawRange === "12FM" ? "12FM" : "FM";

  const payload =
    shell.ok && shell.person_id
      ? await getTechScorecardPayload({ person_id: shell.person_id })
      : null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <TechSurfaceHeader
          title="Metrics"
          fullName={who.full_name}
          techId={who.tech_id}
          affiliation={who.affiliation}
        />
      </section>

      <TechMetricsClient
        initialRange={range}
        tiles={payload?.tiles ?? []}
      />
    </div>
  );
}