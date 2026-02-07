"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type PersonAdminRow = {
  person_id: string;
  full_name: string | null;
  emails: string | null;
  mobile: string | null;
  fuse_emp_id: string | null;
  person_nt_login: string | null;
  active: boolean | null;
  role: string | null;
};

type PersonAdminResponse = {
  rows: PersonAdminRow[];
  page: { pageIndex: number; pageSize: number; totalRows?: number };
  error?: string;
};

export function usePersonAdmin(opts?: { pageSize?: number }) {
  const [q, setQ] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(opts?.pageSize ?? 25);

  const [data, setData] = useState<PersonAdminResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const params = useMemo(() => ({ q, pageIndex, pageSize }), [q, pageIndex, pageSize]);

  const fetchNow = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams();
      if (params.q.trim()) sp.set("q", params.q.trim());
      sp.set("pageIndex", String(params.pageIndex));
      sp.set("pageSize", String(params.pageSize));

      const res = await fetch(`/api/admin/catalogue/person?${sp.toString()}`, { method: "GET" });
      const json = (await res.json()) as PersonAdminResponse & { error?: string };

      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setData(json);
    } catch (e: any) {
      setData(null);
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void fetchNow();
  }, [fetchNow]);

  return {
    q,
    setQ: (v: string) => {
      setPageIndex(0);
      setQ(v);
    },

    pageIndex,
    setPageIndex,

    pageSize,
    setPageSize: (n: number) => {
      setPageIndex(0);
      setPageSize(n);
    },

    data,
    loading,
    err,
    refresh: fetchNow,
  };
}