import type { CatalogueLookupsByKey } from "./types";

/**
 * Each lookup domain has:
 *  1) a typed shape in `CatalogueLookupsByKey` (types.ts)
 *  2) a single endpoint registered here
 *
 * Contract:
 * - The endpoint must return JSON matching the domain's type exactly.
 * - Keep shapes explicit per domain so views/forms get autocomplete + type safety.
 */
const LOOKUP_ENDPOINTS: Record<keyof CatalogueLookupsByKey, string> = {
  pc_org: "/api/admin/catalogue/pc_org/lookups",
  assignment: "/api/admin/catalogue/assignment/lookups",
};

export async function fetchCatalogueLookups<K extends keyof CatalogueLookupsByKey>(
  key: K,
  init?: RequestInit
): Promise<CatalogueLookupsByKey[K]> {
  const res = await fetch(LOOKUP_ENDPOINTS[key], { method: "GET", ...init });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((json as any)?.error ?? `Failed to load lookups: ${String(key)}`);
  }

  return json as CatalogueLookupsByKey[K];
}