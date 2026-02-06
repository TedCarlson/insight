// apps/web/src/features/roster/add-to-roster/hooks/usePersonSearch.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PersonSearchRow } from "@/features/roster/add-to-roster/lib/personSearchFormat";

type UsePersonSearchOpts = {
  initialQuery?: string;
  limit?: number;
};

type PersonSearchState = {
  q: string;
  setQ: (v: string) => void;

  loading: boolean;
  error: string | null;

  results: PersonSearchRow[];
  refresh: () => Promise<void>;
  clear: () => void;
};

export function usePersonSearch(opts: UsePersonSearchOpts = {}): PersonSearchState {
  const limit = opts.limit ?? 25;

  const [q, setQ] = useState(opts.initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PersonSearchRow[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const payload = useMemo(() => {
    const query = q.trim();
    return { query, limit };
  }, [q, limit]);

  async function refresh() {
    const query = payload.query;
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      // NOTE: If your API differs, change only this fetch block.
      const res = await fetch("/api/people-inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query, limit }),
        signal: ac.signal,
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Search failed");

      const rows = (json?.data ?? json ?? []) as PersonSearchRow[];
      setResults(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQ("");
    setResults([]);
    setError(null);
  }

  // light debounce
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.query, payload.limit]);

  return { q, setQ, loading, error, results, refresh, clear };
}