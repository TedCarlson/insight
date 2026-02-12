// apps/web/src/features/metrics-admin/lib/spillDefaults.ts

export type Direction = "HIGHER_BETTER" | "LOWER_BETTER";
export type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

export type KpiDefLike = {
  min_value?: number | null;
  max_value?: number | null;
  unit?: string | null; // "pct" | "score" | etc
  direction?: Direction | null;
};

export type RubricBand = {
  min_value: number | null;
  max_value: number | null;
  score_value: number | null;
};

export type RubricMap = Record<BandKey, RubricBand>;

const EPS = 0.01;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Pick a reasonable default "MEETS width" based on KPI range.
 * - For pct-ish metrics (0..100): ~2% with min 0.5 cap 5
 * - For scores (-100..100): ~4 with min 2 cap 10
 */
function defaultMeetsWidth(def: KpiDefLike): number {
  const min = num(def.min_value) ?? 0;
  const max = num(def.max_value) ?? 100;

  const span = Math.abs(max - min);
  const unit = String(def.unit ?? "").toLowerCase();

  if (unit === "score") {
    return clamp(span * 0.02, 2, 10);
  }

  return clamp(span * 0.02, 0.5, 5);
}

/**
 * Score defaults derived from grade_value:
 * - EXCEEDS: 100% of grade_value
 * - MEETS: 75%
 * - NEEDS_IMPROVEMENT: 50%
 * - MISSES: 0
 * - NO_DATA: null
 */
function defaultScores(gradeValue: number | null): Record<BandKey, number | null> {
  const g = gradeValue ?? null;
  if (g === null) {
    return { EXCEEDS: null, MEETS: null, NEEDS_IMPROVEMENT: null, MISSES: null, NO_DATA: null };
  }
  return {
    EXCEEDS: g,
    MEETS: Number((g * 0.75).toFixed(4)),
    NEEDS_IMPROVEMENT: Number((g * 0.5).toFixed(4)),
    MISSES: 0,
    NO_DATA: null,
  };
}

/**
 * Compute default rubric bands from:
 * - direction
 * - threshold
 * - KPI min/max bounds (optional)
 * - grade_value (points)
 *
 * Decimals are preserved.
 */
export function computeRubricDefaults(opts: {
  def: KpiDefLike;
  threshold: number;
  grade_value?: number | null;
}): RubricMap {
  const threshold = opts.threshold;

  const dir: Direction = (opts.def.direction ?? "HIGHER_BETTER") as Direction;
  const minBound = num(opts.def.min_value);
  const maxBound = num(opts.def.max_value);

  const meetsWidth = defaultMeetsWidth(opts.def);
  const scores = defaultScores(num(opts.grade_value));

  let exceeds: { min: number | null; max: number | null };
  let meets: { min: number | null; max: number | null };
  let needs: { min: number | null; max: number | null };
  let misses: { min: number | null; max: number | null };

  if (dir === "HIGHER_BETTER") {
    const meetsMin = threshold;
    const meetsMax = threshold + meetsWidth - EPS;

    meets = { min: meetsMin, max: meetsMax };
    exceeds = { min: meetsMax + EPS, max: maxBound ?? null };
    needs = { min: threshold - meetsWidth, max: threshold - EPS };
    misses = { min: minBound ?? null, max: (needs.min !== null ? needs.min - EPS : null) };
  } else {
    // LOWER_BETTER: MEETS ends at threshold
    const meetsMin = threshold - meetsWidth + EPS;
    const meetsMax = threshold;

    meets = { min: meetsMin, max: meetsMax };
    exceeds = { min: minBound ?? null, max: (meetsMin !== null ? meetsMin - EPS : null) };
    needs = { min: threshold + EPS, max: threshold + meetsWidth };
    misses = { min: (needs.max !== null ? needs.max + EPS : null), max: maxBound ?? null };
  }

  function clampToBounds(v: number | null) {
    if (v === null) return null;
    if (minBound !== null && maxBound !== null) return clamp(v, minBound, maxBound);
    if (minBound !== null) return Math.max(v, minBound);
    if (maxBound !== null) return Math.min(v, maxBound);
    return v;
  }

  return {
    EXCEEDS: {
      min_value: clampToBounds(exceeds.min),
      max_value: clampToBounds(exceeds.max),
      score_value: scores.EXCEEDS,
    },
    MEETS: {
      min_value: clampToBounds(meets.min),
      max_value: clampToBounds(meets.max),
      score_value: scores.MEETS,
    },
    NEEDS_IMPROVEMENT: {
      min_value: clampToBounds(needs.min),
      max_value: clampToBounds(needs.max),
      score_value: scores.NEEDS_IMPROVEMENT,
    },
    MISSES: {
      min_value: clampToBounds(misses.min),
      max_value: clampToBounds(misses.max),
      score_value: scores.MISSES,
    },
    NO_DATA: {
      min_value: null,
      max_value: null,
      score_value: scores.NO_DATA,
    },
  };
}