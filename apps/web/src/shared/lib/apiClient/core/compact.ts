/**
 * Remove keys with value === undefined so PostgREST doesn't treat them as provided params.
 * (Keeping null is intentional; null means "set to null" when the RPC supports that param.)
 */
export function compactRecord<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}