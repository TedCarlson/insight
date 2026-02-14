export function formatScore(value: any) {
  if (value == null) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(2);
}

export function fmtKpi(v: any): string {
  if (v == null) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

export const numOrInf = (n: any) =>
  n == null ? Number.POSITIVE_INFINITY : Number(n);