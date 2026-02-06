// apps/web/src/features/roster/add-to-roster/hooks/usePersonSearch.ts
"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/shared/data/supabase/client";

export type PersonHit = {
  person_id: string;
  full_name: string | null;
  emails: string | null;
  mobile: string | null;
  fuse_emp_id: string | null;
  person_nt_login: string | null;
  person_csg_id: string | null;
  person_notes: string | null;

  active: boolean | null;

  // affiliation keys (label is derived in UI using coOptions)
  co_ref_id: string | null;
  co_code: string | null;
};

export type UsePersonSearchOpts = {
  excludePersonIds?: Set<string>;
  minChars?: number; // default 2
  limit?: number; // default 25
  debounceMs?: number; // default 250
};

type State = {
  query: string;
  loading: boolean;
  error: string | null;
  results: PersonHit[];
};

export function usePersonSearch(opts: UsePersonSearchOpts = {}) {
  const supabase = useMemo(() => createClient(), []);
  const exclude = opts.excludePersonIds;
  const minChars = opts.minChars ?? 2;
  const limit = opts.limit ?? 25;
  const debounceMs = opts.debounceMs ?? 250;

  const [state, setState] = useState<State>({
    query: "",
    loading: false,
    error: null,
    results: [],
  });

  const timerRef = useRef<number | null>(null);
  const lastReqRef = useRef<number>(0);

  const runSearch = useCallback(
    async (q: string) => {
      const query = String(q ?? "").trim();
      const reqId = Date.now();
      lastReqRef.current = reqId;

      // Empty/short => stale state, no fetch
      if (!query || query.length < minChars) {
        setState((s) => ({ ...s, query, loading: false, error: null, results: [] }));
        return;
      }

      setState((s) => ({ ...s, query, loading: true, error: null }));

      try {
        const like = `%${query}%`;

        // ✅ ONLY columns that exist on public.person (per your schema)
        const { data, error } = await supabase
          .from("person")
          .select(
            [
              "person_id",
              "full_name",
              "emails",
              "mobile",
              "fuse_emp_id",
              "person_nt_login",
              "person_csg_id",
              "person_notes",
              "active",
              "co_ref_id",
              "co_code",
            ].join(",")
          )
          // ✅ Search across multiple fields (NOT one field)
          .or(
            [
              `full_name.ilike.${like}`,
              `emails.ilike.${like}`,
              `mobile.ilike.${like}`,
              `fuse_emp_id.ilike.${like}`,
              `person_nt_login.ilike.${like}`,
              `person_csg_id.ilike.${like}`,
            ].join(",")
          )
          .order("full_name", { ascending: true })
          .limit(limit);

        if (lastReqRef.current !== reqId) return; // stale response
        if (error) throw error;

        const rows = (data ?? []) as any[];

        const filtered: PersonHit[] = rows
          .map((r) => ({
            person_id: String(r.person_id),
            full_name: r.full_name ?? null,
            emails: r.emails ?? null,
            mobile: r.mobile ?? null,
            fuse_emp_id: r.fuse_emp_id ?? null,
            person_nt_login: r.person_nt_login ?? null,
            person_csg_id: r.person_csg_id ?? null,
            person_notes: r.person_notes ?? null,
            active: typeof r.active === "boolean" ? r.active : null,
            co_ref_id: r.co_ref_id ?? null,
            co_code: r.co_code ?? null,
          }))
          .filter((p) => (exclude ? !exclude.has(p.person_id) : true));

        setState((s) => ({ ...s, loading: false, results: filtered, error: null }));
      } catch (e: any) {
        if (lastReqRef.current !== reqId) return;
        setState((s) => ({
          ...s,
          loading: false,
          results: [],
          error: e?.message ?? "Search failed",
        }));
      }
    },
    [supabase, exclude, minChars, limit]
  );

  const onQueryChange = useCallback(
    (q: string) => {
      const next = String(q ?? "");
      setState((s) => ({ ...s, query: next }));

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void runSearch(next);
      }, debounceMs);
    },
    [runSearch, debounceMs]
  );

  const clear = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setState({ query: "", loading: false, error: null, results: [] });
  }, []);

  return {
    query: state.query,
    loading: state.loading,
    error: state.error,
    results: state.results,
    onQueryChange,
    searchNow: runSearch,
    clear,
  };
}