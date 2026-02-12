export const BANDS = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"] as const;

export function parseNum(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function clampNum(n: number | null, min: number, max: number): number | null {
  if (n === null) return null;
  return Math.min(max, Math.max(min, n));
}