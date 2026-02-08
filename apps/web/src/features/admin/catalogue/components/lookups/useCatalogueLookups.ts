import { useEffect, useState } from "react";
import type { CatalogueLookupsByKey } from "./types";
import { fetchCatalogueLookups } from "./fetchLookups";

export function useCatalogueLookups<K extends keyof CatalogueLookupsByKey>(key: K) {
  const [data, setData] = useState<CatalogueLookupsByKey[K] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const lookups = await fetchCatalogueLookups(key);

        if (!cancelled) setData(lookups);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load lookups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { data, error, loading };
}