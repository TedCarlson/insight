import { headers } from "next/headers";

import TechSurfaceHeader from "@/features/tech/shared/components/TechSurfaceHeader";
import { getTechWhoAmI } from "@/features/tech/shared/lib/getTechWhoAmI";
import TechMetricsClient from "@/features/tech/metrics/components/TechMetricsClient";
import { getTechScorecardPayload } from "@/features/metrics/scorecard/lib/getTechScorecardPayload.server";
import { getTechShellContext } from "@/features/tech/lib/getTechShellContext";

type RangeKey = "FM" | "3FM" | "12FM";

async function getActivePresetKey(): Promise<string | null> {
  try {
    const h = await headers();
    const protocol = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");

    if (!host) return null;

    const res = await fetch(`${protocol}://${host}/api/admin/metrics-colors`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    return json?.activePresetKey ?? null;
  } catch {
    return null;
  }
}

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

  const [payload, activePresetKey] =
    shell.ok && shell.person_id
      ? await Promise.all([
          getTechScorecardPayload({ person_id: shell.person_id }),
          getActivePresetKey(),
        ])
      : [null, null];

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
        activePresetKey={activePresetKey}
      />
    </div>
  );
}