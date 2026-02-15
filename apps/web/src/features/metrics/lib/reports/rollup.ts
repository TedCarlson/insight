export type P4PRollup = {
  headcount: number;
  tnps_score: number | null;
  ftr_rate: number | null;
  tool_usage_rate: number | null;
};

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Exclude "Totals" rows from any math.
 * Keep this conservative and stable.
 */
export function isTotalsRow(row: any): boolean {
  const tech = String(row?.tech_id ?? "").toLowerCase();
  return tech.includes("totals");
}

/**
 * Weighted rollups:
 * - FTR weighted by ftr_contact_jobs
 * - Tool Usage weighted by tu_eligible_jobs
 * - tNPS weighted by tnps_surveys
 */
export function computeP4PRollup(rows: any[]): P4PRollup {
  const scoped = (rows ?? []).filter((r) => !isTotalsRow(r));
  const headcount = scoped.length;

  let ftrNum = 0;
  let ftrDen = 0;

  let tuNum = 0;
  let tuDen = 0;

  let tnpsNum = 0;
  let tnpsDen = 0;

  for (const r of scoped) {
    const ftr = toNum(r.ftr_rate);
    const ftrJobs = toNum(r.ftr_contact_jobs);

    if (ftr != null && ftrJobs != null && ftrJobs > 0) {
      ftrNum += ftr * ftrJobs;
      ftrDen += ftrJobs;
    }

    const tu = toNum(r.tool_usage_rate);
    const tuJobs = toNum(r.tu_eligible_jobs);

    if (tu != null && tuJobs != null && tuJobs > 0) {
      tuNum += tu * tuJobs;
      tuDen += tuJobs;
    }

    const tnps = toNum(r.tnps_score);
    const surveys = toNum(r.tnps_surveys);

    if (tnps != null && surveys != null && surveys > 0) {
      tnpsNum += tnps * surveys;
      tnpsDen += surveys;
    }
  }

  return {
    headcount,
    ftr_rate: ftrDen > 0 ? ftrNum / ftrDen : null,
    tool_usage_rate: tuDen > 0 ? tuNum / tuDen : null,
    tnps_score: tnpsDen > 0 ? tnpsNum / tnpsDen : null,
  };
}

export type DeltaTrend = "UP" | "DOWN" | "FLAT" | null;

export function trendFromDelta(delta: number | null, eps = 0.000001): DeltaTrend {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) <= eps) return "FLAT";
  return delta > 0 ? "UP" : "DOWN";
}

export function delta(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null) return null;
  const d = current - prior;
  return Number.isFinite(d) ? d : null;
}

export function fmtValue(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function fmtDelta(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Number(n.toFixed(digits));
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}`;
}

export function trendGlyph(t: DeltaTrend): string {
  if (t === "UP") return "↑";
  if (t === "DOWN") return "↓";
  if (t === "FLAT") return "→";
  return "";
}