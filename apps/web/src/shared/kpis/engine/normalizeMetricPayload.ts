// path: apps/web/src/shared/kpis/engine/normalizeMetricPayload.ts

export function normalizeMetricPayload(
  row: Record<string, any>
): Record<string, number> {
  if (!row) return {};

  const out: Record<string, number> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "number") continue;

    const normalizedKey = key
      .toLowerCase()
      .replace(/[\s_%]/g, "_");

    out[normalizedKey] = value;
  }

  return out;
}