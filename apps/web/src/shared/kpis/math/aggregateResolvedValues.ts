import type {
  KpiDefinitionLike,
  RawMetricPayload,
} from "@/shared/kpis/contracts/kpiTypes";
import { resolveKpiFamily } from "@/shared/kpis/definitions/resolveKpiFamily";
import { normalizeKpiKey } from "@/shared/kpis/definitions/normalizeKpiKey";
import { computeRatio } from "./computeRatio";
import { computeTnps } from "./computeTnps";
import { resolveRawValue } from "./resolveRawValue";

function numOrZero(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function resolveByCandidateKeys(args: {
  raw: RawMetricPayload;
  candidates: string[];
}): number | null {
  for (const candidate of args.candidates) {
    const direct = args.raw[candidate];
    const n = typeof direct === "string" ? Number(direct) : direct;
    if (typeof n === "number" && Number.isFinite(n)) {
      return n;
    }
  }

  const normalizedCandidates = args.candidates.map(normalizeKpiKey);

  for (const [key, value] of Object.entries(args.raw)) {
    const normalizedKey = normalizeKpiKey(key);
    if (!normalizedCandidates.includes(normalizedKey)) continue;

    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n === "number" && Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function getTnpsComponent(args: {
  raw: RawMetricPayload;
  kind: "surveys" | "promoters" | "detractors";
}): number {
  if (args.kind === "surveys") {
    return numOrZero(
      resolveByCandidateKeys({
        raw: args.raw,
        candidates: [
          "tNPS Surveys",
          "tnps_surveys",
          "tNPS_Surveys",
          "Surveys",
        ],
      })
    );
  }

  if (args.kind === "promoters") {
    return numOrZero(
      resolveByCandidateKeys({
        raw: args.raw,
        candidates: ["Promoters", "tnps_promoters"],
      })
    );
  }

  return numOrZero(
    resolveByCandidateKeys({
      raw: args.raw,
      candidates: ["Detractors", "tnps_detractors"],
    })
  );
}

function getFtrComponent(args: {
  raw: RawMetricPayload;
  kind: "numerator" | "denominator";
}): number {
  if (args.kind === "numerator") {
    const explicit = resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "ftr_numerator",
        "ftr completed",
        "ftr_completed",
        "jobs completed first trip",
        "first trip completed",
        "first_trip_completed",
        "first time right hits",
        "first_time_right_hits",
      ],
    });

    if (explicit != null) return explicit;

    const denominator = resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "ftr_denominator",
        "ftr eligible",
        "ftr_eligible",
        "eligible jobs",
        "eligible_jobs",
        "completed jobs",
        "completed_jobs",
        "jobs completed",
        "jobs_completed",
        "total ftr/contact jobs",
        "totalftr/contactjobs",
        "total_ftr_contact_jobs",
      ],
    });

    const failJobs = resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "FTRFailJobs",
        "ftr_fail_jobs",
        "ftr fail jobs",
      ],
    });

    if (denominator != null && failJobs != null) {
      return Math.max(denominator - failJobs, 0);
    }

    return 0;
  }

  return numOrZero(
    resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "ftr_denominator",
        "ftr eligible",
        "ftr_eligible",
        "eligible jobs",
        "eligible_jobs",
        "completed jobs",
        "completed_jobs",
        "jobs completed",
        "jobs_completed",
        "total ftr/contact jobs",
        "totalftr/contactjobs",
        "total_ftr_contact_jobs",
      ],
    })
  );
}

function getToolUsageComponent(args: {
  raw: RawMetricPayload;
  kind: "numerator" | "denominator";
}): number {
  if (args.kind === "numerator") {
    return numOrZero(
      resolveByCandidateKeys({
        raw: args.raw,
        candidates: [
          "tool_usage_numerator",
          "tool used jobs",
          "tool_used_jobs",
          "jobs with tool usage",
          "jobs_with_tool_usage",
          "tool usage hits",
          "tool_usage_hits",
          "tool compliant jobs",
          "tool_compliant_jobs",
          "TUResult",
        ],
      })
    );
  }

  return numOrZero(
    resolveByCandidateKeys({
      raw: args.raw,
      candidates: [
        "tool_usage_denominator",
        "tool usage eligible",
        "tool_usage_eligible",
        "eligible jobs",
        "eligible_jobs",
        "completed jobs",
        "completed_jobs",
        "jobs completed",
        "jobs_completed",
        "total jobs",
        "total_jobs",
        "TUEligibleJobs",
      ],
    })
  );
}

function sumResolvedValues(args: {
  def: KpiDefinitionLike;
  rows: RawMetricPayload[];
}): number | null {
  let total = 0;
  let foundAny = false;

  for (const raw of args.rows) {
    const value = resolveRawValue({
      def: args.def,
      raw,
    });

    if (value == null || !Number.isFinite(value)) continue;
    total += value;
    foundAny = true;
  }

  return foundAny ? total : null;
}

export function aggregateResolvedValues(args: {
  def: KpiDefinitionLike;
  rows: RawMetricPayload[];
}): number | null {
  const family = resolveKpiFamily(args.def);

  if (family === "tnps") {
    let surveys = 0;
    let promoters = 0;
    let detractors = 0;

    for (const raw of args.rows) {
      surveys += getTnpsComponent({ raw, kind: "surveys" });
      promoters += getTnpsComponent({ raw, kind: "promoters" });
      detractors += getTnpsComponent({ raw, kind: "detractors" });
    }

    return computeTnps({
      surveys,
      promoters,
      detractors,
    });
  }

  if (family === "ratio") {
    const key = normalizeKpiKey(args.def.kpi_key);

    if (
      key === "ftr" ||
      key === "ftrrate" ||
      normalizeKpiKey(args.def.label ?? "").includes("ftr") ||
      normalizeKpiKey(args.def.customer_label ?? "").includes("ftr")
    ) {
      let numerator = 0;
      let denominator = 0;

      for (const raw of args.rows) {
        numerator += getFtrComponent({ raw, kind: "numerator" });
        denominator += getFtrComponent({ raw, kind: "denominator" });
      }

      return computeRatio({ numerator, denominator });
    }

    if (
      key === "toolusage" ||
      key === "toolusagerate" ||
      normalizeKpiKey(args.def.label ?? "").includes("toolusage") ||
      normalizeKpiKey(args.def.customer_label ?? "").includes("toolusage") ||
      normalizeKpiKey(args.def.label ?? "").includes("tool") ||
      normalizeKpiKey(args.def.customer_label ?? "").includes("tool")
    ) {
      let numerator = 0;
      let denominator = 0;

      for (const raw of args.rows) {
        numerator += getToolUsageComponent({ raw, kind: "numerator" });
        denominator += getToolUsageComponent({ raw, kind: "denominator" });
      }

      return computeRatio({ numerator, denominator });
    }

    return sumResolvedValues(args);
  }

  if (family === "sum") {
    return sumResolvedValues(args);
  }

  if (family === "direct_value") {
    return sumResolvedValues(args);
  }

  return null;
}