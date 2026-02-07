"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EdgePermissionsGridResponse,
  EdgePermissionsQuery,
  EdgePermissionTogglePayload,
  EdgeScope,
} from "../types";
import { fetchEdgePermissionsGrid, toggleEdgePermission } from "../lib/api";

export function useEdgePermissions(initial?: Partial<EdgePermissionsQuery>) {
  const [query, setQuery] = useState<EdgePermissionsQuery>({
    q: initial?.q ?? "",
    lob: initial?.lob ?? "ALL",

    scope: initial?.scope ?? "global",
    pcOrgId: initial?.pcOrgId ?? null,

    pageIndex: initial?.pageIndex ?? 0,
    pageSize: initial?.pageSize ?? 25,
  });

  const [data, setData] = useState<EdgePermissionsGridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const next = await fetchEdgePermissionsGrid(query);
      setData(next);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSearch = useCallback((q: string) => {
    setQuery((p) => ({ ...p, q, pageIndex: 0 }));
  }, []);

  const setLob = useCallback((lob: EdgePermissionsQuery["lob"]) => {
    setQuery((p) => ({ ...p, lob, pageIndex: 0 }));
  }, []);

  const setScope = useCallback((scope: EdgeScope) => {
    setQuery((p) => ({
      ...p,
      scope,
      // important: if switching to global, clear pcOrgId
      pcOrgId: scope === "global" ? null : p.pcOrgId,
      pageIndex: 0,
    }));
  }, []);

  const setPcOrgId = useCallback((pcOrgId: string | null) => {
    setQuery((p) => ({ ...p, pcOrgId, pageIndex: 0 }));
  }, []);

  const setPage = useCallback((pageIndex: number) => {
    setQuery((p) => ({ ...p, pageIndex }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setQuery((p) => ({ ...p, pageSize, pageIndex: 0 }));
  }, []);

  const onToggle = useCallback(
    async (payload: EdgePermissionTogglePayload) => {
      // optimistic update, rollback on error
      const prev = data;

      if (data) {
        const next: EdgePermissionsGridResponse = {
          ...data,
          rows: data.rows.map((r) => {
            if (r.user.authUserId !== payload.targetAuthUserId) return r;
            return {
              ...r,
              grants: { ...r.grants, [payload.permissionKey]: payload.enabled },
            };
          }),
        };
        setData(next);
      }

      try {
        await toggleEdgePermission(payload);
      } catch (e: any) {
        setErr(e?.message ?? "Toggle failed");
        if (prev) setData(prev);
      }
    },
    [data]
  );

  const permissionKeys = useMemo(() => data?.permissionKeys ?? [], [data]);
  const pcOrgs = useMemo(() => data?.pcOrgs ?? [], [data]);

  return {
    query,
    data,
    loading,
    err,

    permissionKeys,
    pcOrgs,

    refresh,
    setSearch,
    setLob,
    setScope,
    setPcOrgId,
    setPage,
    setPageSize,
    onToggle,
  };
}