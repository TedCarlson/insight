"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type OfficeAdminRow = {
  office_id: string;
  office_name: string;
  address: string | null;
  sub_region: string | null;
};

export type OfficeDraft = {
  office_name: string;
  address: string;
  sub_region: string;
};

type OfficeAdminResponse = {
  rows: OfficeAdminRow[];
  page: { pageIndex: number; pageSize: number; totalRows?: number };
};

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function useOfficeAdmin(opts?: { pageSize?: number }) {
  const [q, setQ] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(opts?.pageSize ?? 25);

  const [data, setData] = useState<OfficeAdminResponse | null>(null);
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

      const res = await fetch(`/api/admin/catalogue/office?${sp.toString()}`);
      const json = (await res.json()) as { rows?: OfficeAdminRow[]; page?: any; error?: string };

      if (!res.ok) throw new Error(json.error ?? "Request failed");

      setData({
        rows: json.rows ?? [],
        page: json.page ?? { pageIndex: params.pageIndex, pageSize: params.pageSize },
      });
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

export function blankOfficeDraft(): OfficeDraft {
  return { office_name: "", address: "", sub_region: "" };
}

export function draftFromOfficeRow(r: OfficeAdminRow): OfficeDraft {
  return {
    office_name: r.office_name ?? "",
    address: r.address ?? "",
    sub_region: r.sub_region ?? "",
  };
}