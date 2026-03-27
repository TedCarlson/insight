import TechSurfaceHeader from "@/features/tech/shared/components/TechSurfaceHeader";
import { getTechWhoAmI } from "@/features/tech/shared/lib/getTechWhoAmI";
import TechMetricsClient from "@/features/tech/metrics/components/TechMetricsClient";
import { getTechShellContext } from "@/features/tech/lib/getTechShellContext";
import { getTechMetricsRangePayload } from "@/features/tech/metrics/lib/getTechMetricsRangePayload.server";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";
import { getMetricFtrPayload } from "@/features/tech/metrics/lib/getMetricFtrPayload.server";
import { getMetricTnpsPayload } from "@/features/tech/metrics/lib/getMetricTnpsPayload.server";
import { getMetricToolUsagePayload } from "@/features/tech/metrics/lib/getMetricToolUsagePayload.server";
import { getMetricPurePassPayload } from "@/features/tech/metrics/lib/getMetricPurePassPayload.server";
import { getMetric48HrPayload } from "@/features/tech/metrics/lib/getMetric48HrPayload.server";
import { getMetricRepeatPayload } from "@/features/tech/metrics/lib/getMetricRepeatPayload.server";
import { getMetricSoiPayload } from "@/features/tech/metrics/lib/getMetricSoiPayload.server";
import { getMetricReworkPayload } from "@/features/tech/metrics/lib/getMetricReworkPayload.server";
import { getMetricMetPayload } from "@/features/tech/metrics/lib/getMetricMetPayload.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isTnpsKey(kpiKey: string): boolean {
  return kpiKey.toLowerCase().includes("tnps");
}

function isToolUsageKey(kpiKey: string): boolean {
  const k = kpiKey.toLowerCase();
  return k.includes("tool_usage") || k.includes("toolusage") || k.includes("tu_rate");
}

function isPurePassKey(kpiKey: string): boolean {
  const k = kpiKey.toLowerCase();
  return k.includes("pure_pass") || k.includes("purepass") || k.includes("pht_pure_pass");
}

function is48HrKey(kpiKey: string): boolean {
  const k = kpiKey.toLowerCase();
  return k.includes("48hr") || k.includes("48_hr") || k.includes("callback");
}

function isRepeatKey(kpiKey: string): boolean {
  return kpiKey.toLowerCase().includes("repeat");
}

function isSoiKey(kpiKey: string): boolean {
  return kpiKey.toLowerCase().includes("soi");
}

function isReworkKey(kpiKey: string): boolean {
  return kpiKey.toLowerCase().includes("rework");
}

function isMetKey(kpiKey: string): boolean {
  const k = kpiKey.toLowerCase();
  return k === "met_rate" || k === "met" || k.includes("metrate");
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

  const range: MetricsRangeKey =
    rawRange === "PREVIOUS"
      ? "PREVIOUS"
      : rawRange === "3FM"
        ? "3FM"
        : rawRange === "12FM"
          ? "12FM"
          : "FM";

  const [
    payload,
    ftrPayload,
    tnpsPayload,
    toolUsagePayload,
    purePassPayload,
    callback48HrPayload,
    repeatPayload,
    soiPayload,
    reworkPayload,
    metPayload,
  ] =
    shell.ok && shell.person_id && who.tech_id
      ? await Promise.all([
          getTechMetricsRangePayload({
            person_id: shell.person_id,
            range,
          }),
          getMetricFtrPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricTnpsPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricToolUsagePayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricPurePassPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetric48HrPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricRepeatPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricSoiPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricReworkPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
          getMetricMetPayload({
            person_id: shell.person_id,
            tech_id: who.tech_id,
            range,
          }),
        ])
      : [null, null, null, null, null, null, null, null, null, null];

  const tiles =
    payload?.tiles?.map((tile) => {
      if (tile.kpi_key === "ftr_rate") {
        const ftrJobs = ftrPayload?.summary?.total_contact_jobs ?? null;
        const failJobs = ftrPayload?.summary?.total_fail_jobs ?? null;

        return {
          ...tile,
          context: {
            sample_short: ftrJobs,
            sample_long: failJobs,
            meets_min_volume: null,
          },
        };
      }

      if (isTnpsKey(tile.kpi_key)) {
        const surveys = tnpsPayload?.summary?.tnps_surveys ?? null;
        const promoters = tnpsPayload?.summary?.tnps_promoters ?? null;
        const detractors = tnpsPayload?.summary?.tnps_detractors ?? null;

        return {
          ...tile,
          context: {
            sample_short: surveys,
            sample_long: promoters,
            detractors,
            meets_min_volume: null,
          },
        };
      }

      if (isToolUsageKey(tile.kpi_key)) {
        const eligible = toolUsagePayload?.summary?.tu_eligible_jobs ?? null;
        const compliant = toolUsagePayload?.summary?.tu_compliant_jobs ?? null;

        return {
          ...tile,
          context: {
            sample_short: eligible,
            sample_long: compliant,
            meets_min_volume: null,
          },
        };
      }

      if (isPurePassKey(tile.kpi_key)) {
        const phtJobs = purePassPayload?.summary?.pht_jobs ?? null;
        const purePass = purePassPayload?.summary?.pure_pass ?? null;

        return {
          ...tile,
          context: {
            sample_short: phtJobs,
            sample_long: purePass,
            meets_min_volume: null,
          },
        };
      }

      if (is48HrKey(tile.kpi_key)) {
        const orders = callback48HrPayload?.summary?.contact_orders_48hr ?? null;
        const eligible = callback48HrPayload?.summary?.eligible_jobs_48hr ?? null;

        return {
          ...tile,
          context: {
            sample_short: orders,
            sample_long: eligible,
            meets_min_volume: null,
          },
        };
      }

      if (isRepeatKey(tile.kpi_key)) {
        const repeats = repeatPayload?.summary?.repeat_count ?? null;
        const tcs = repeatPayload?.summary?.tc_count ?? null;

        return {
          ...tile,
          context: {
            sample_short: repeats,
            sample_long: tcs,
            meets_min_volume: null,
          },
        };
      }

      if (isSoiKey(tile.kpi_key)) {
        const soiCount = soiPayload?.summary?.soi_count ?? null;
        const installs = soiPayload?.summary?.installs ?? null;

        return {
          ...tile,
          context: {
            sample_short: soiCount,
            sample_long: installs,
            meets_min_volume: null,
          },
        };
      }

      if (isReworkKey(tile.kpi_key)) {
        const reworkCount = reworkPayload?.summary?.rework_count ?? null;
        const totalAppts = reworkPayload?.summary?.total_appts ?? null;

        return {
          ...tile,
          context: {
            sample_short: reworkCount,
            sample_long: totalAppts,
            meets_min_volume: null,
          },
        };
      }

      if (isMetKey(tile.kpi_key)) {
        const metCount = metPayload?.summary?.met_count ?? null;
        const totalAppts = metPayload?.summary?.total_appts ?? null;

        return {
          ...tile,
          context: {
            sample_short: metCount,
            sample_long: totalAppts,
            meets_min_volume: null,
          },
        };
      }

      return tile;
    }) ?? [];

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
        tiles={tiles}
        ftrDebug={ftrPayload?.debug ?? null}
        tnpsDebug={tnpsPayload?.debug ?? undefined}
        toolUsageDebug={toolUsagePayload?.debug ?? undefined}
        purePassDebug={purePassPayload?.debug ?? undefined}
        callback48HrDebug={callback48HrPayload?.debug ?? undefined}
        repeatDebug={repeatPayload?.debug ?? undefined}
        soiDebug={soiPayload?.debug ?? undefined}
        reworkDebug={reworkPayload?.debug ?? undefined}
        metDebug={metPayload?.debug ?? undefined}
      />
    </div>
  );
}