// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/lib/reports/format.ts

export type ValueFormat = "NUM" | "PCT" | "INT" | "SCORE";

/**
 * Safe number coercion used by report rendering.
 * - null/undefined/"" => null
 * - numeric string => number
 * - NaN/inf => null
 */
export function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Existing helper used in sorting (keep behavior stable).
 */
export function numOrInf(v: unknown): number {
  const n = toNumberOrNull(v);
  return n == null ? Number.POSITIVE_INFINITY : n;
}

/**
 * Central formatting: tiles + tables should call this.
 *
 * - PCT assumes incoming value is already a percent (0-100), NOT 0-1.
 * - SCORE uses fixed decimals (default 3) unless overridden.
 * - NUM uses decimals if provided; otherwise trims to sensible default.
 */
export function formatValue(args: {
  value: unknown;
  format?: ValueFormat | string | null;
  decimals?: number | null;
  nullText?: string;
}): string {
  const nullText = args.nullText ?? "—";
  const n = toNumberOrNull(args.value);
  if (n == null) return nullText;

  const fmt = String(args.format ?? "NUM").toUpperCase();
  const d = args.decimals == null ? null : Number(args.decimals);

  if (fmt === "INT") {
    return String(Math.round(n));
  }

  if (fmt === "PCT" || fmt === "PERCENT" || fmt === "%") {
    // Default: 1 decimal unless explicitly set
    const dd = d == null ? 1 : d;
    return `${n.toFixed(dd)}%`;
  }

  if (fmt === "SCORE") {
    // Default: 3 decimals unless explicitly set
    const dd = d == null ? 3 : d;
    return n.toFixed(dd);
  }

  // NUM (default)
  const dd = d == null ? 2 : d;
  return n.toFixed(dd);
}

/**
 * Convenience: delta display that preserves sign.
 */
export function formatDelta(args: {
  delta: unknown;
  format?: ValueFormat | string | null;
  decimals?: number | null;
}): string {
  const n = toNumberOrNull(args.delta);
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + formatValue({ value: n, format: args.format, decimals: args.decimals, nullText: "0" }).replace(/^0$/, "0");
}