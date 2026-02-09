"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";
import type { DailyRowFromApi } from "../types";

type SortKey = "log_date" | "state_name" | "state_code" | "updated_at";
type SortDir = "asc" | "desc";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function headerCell(className: string, label: string) {
  return (
    <div className={className} role="columnheader">
      {label}
    </div>
  );
}

export default function LocateDailyHistoryClient() {
  const [rows, setRows] = useState<DailyRowFromApi[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [out, setOut] = useState("");

  // controls
  const [q, setQ] = useState(""); // backend should iLike this
  const [onlySaved, setOnlySaved] = useState(false);
  const [sort, setSort] = useState<SortKey>("log_date");
  const [dir, setDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const pageCount = useMemo(() => {
    const pc = Math.ceil((total || 0) / (pageSize || 1));
    return Math.max(1, pc);
  }, [total, pageSize]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    params.set("sort", sort);
    params.set("dir", dir);
    if (q.trim()) params.set("q", q.trim());
    if (onlySaved) params.set("only_saved", "1");
    return params.toString();
  }, [page, pageSize, sort, dir, q, onlySaved]);

  const load = useCallback(async () => {
    setLoading(true);
    setOut("");

    try {
      const res = await fetch(`/api/locate/daily-log/history?${queryString}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setOut(`History load failed: ${json?.error ?? res.status}`);
        setRows([]);
        setTotal(0);
        return;
      }

      setRows(Array.isArray(json.rows) ? json.rows : []);
      setTotal(Number(json.total ?? 0));
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // When filters/sort change, keep page valid.
  useEffect(() => {
    setPage((p) => clamp(p, 1, pageCount));
  }, [pageCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const canPrev = page > 1;
  const canNext = page < pageCount;

  // Grid columns (match header + row cells)
  const gridCols =
    "grid grid-cols-[140px_220px_110px_110px_110px_90px_90px_180px] items-center";

  const thBase = "px-3 py-2 text-left text-xs font-medium text-[var(--to-ink-muted)]";
  const tdBase = "px-3 py-2 text-sm";
  const tdRight = "px-3 py-2 text-sm text-right tabular-nums";
  const tdMuted = "px-3 py-2 text-xs text-[var(--to-ink-muted)]";

  return (
    <div className="grid gap-4">
      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="text-xs font-medium text-[var(--to-ink-muted)] mb-1">Filter (iLike)</div>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder='Type to search (e.g., "PA", "penn", "NJ")'
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-medium text-[var(--to-ink-muted)] mb-1">Sort</div>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setPage(1);
              }}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            >
              <option value="log_date">Log date</option>
              <option value="state_name">State name</option>
              <option value="state_code">State code</option>
              <option value="updated_at">Updated</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-medium text-[var(--to-ink-muted)] mb-1">Direction</div>
            <select
              value={dir}
              onChange={(e) => {
                setDir(e.target.value as SortDir);
                setPage(1);
              }}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <div className="text-xs font-medium text-[var(--to-ink-muted)] mb-1">Size</div>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlySaved}
                onChange={(e) => {
                  setOnlySaved(e.target.checked);
                  setPage(1);
                }}
              />
              Saved only
            </label>

            <Button onClick={() => void load()} disabled={loading} className="ml-auto" variant="secondary">
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>

        {out ? <div className="mt-3 whitespace-pre-wrap text-sm text-[var(--to-ink-muted)]">{out}</div> : null}
      </Card>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <div className={gridCols} role="row">
                {headerCell(thBase, "Date")}
                {headerCell(thBase, "State")}
                {headerCell(`${thBase} text-right`, "Manpower")}
                {headerCell(`${thBase} text-right`, "AM Recv")}
                {headerCell(`${thBase} text-right`, "PM Closed")}
                {headerCell(`${thBase} text-right`, "Proj")}
                {headerCell(`${thBase} text-right`, "Emer")}
                {headerCell(thBase, "Updated")}
              </div>
            </DataTableRow>
          </DataTableHeader>

          <DataTableBody>
            {rows.map((r) => (
              <DataTableRow key={`${r.log_date}:${r.state_code}`}>
                <div className={gridCols} role="row">
                  <div className={tdBase}>{r.log_date}</div>

                  <div className={tdBase}>
                    <div className="font-medium">{r.state_name}</div>
                    <div className="text-xs text-[var(--to-ink-muted)]">{r.state_code}</div>
                  </div>

                  <div className={tdRight}>{Number(r.manpower_count ?? 0)}</div>
                  <div className={tdRight}>{Number(r.tickets_received_am ?? 0)}</div>
                  <div className={tdRight}>{Number(r.tickets_closed_pm ?? 0)}</div>
                  <div className={tdRight}>{Number(r.project_tickets ?? 0)}</div>
                  <div className={tdRight}>{Number(r.emergency_tickets ?? 0)}</div>

                  <div className={tdMuted}>
                    {r.updated_at ? String(r.updated_at).slice(0, 19).replace("T", " ") : "—"}
                  </div>
                </div>
              </DataTableRow>
            ))}

            {!rows.length && !loading ? (
              <DataTableRow>
                <div className="px-3 py-6 text-sm text-[var(--to-ink-muted)]" role="row">
                  No rows found.
                </div>
              </DataTableRow>
            ) : null}

            {loading ? (
              <DataTableRow>
                <div className="px-3 py-6 text-sm text-[var(--to-ink-muted)]" role="row">
                  Loading…
                </div>
              </DataTableRow>
            ) : null}
          </DataTableBody>
        </DataTable>

        <div className="flex items-center justify-between gap-3 p-3 border-t" style={{ borderColor: "var(--to-border)" }}>
          <div className="text-xs text-[var(--to-ink-muted)]">
            Page {page} of {pageCount} • {total} row(s)
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={!canPrev || loading} onClick={() => setPage(1)}>
              First
            </Button>
            <Button variant="secondary" disabled={!canPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="secondary" disabled={!canNext || loading} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
              Next
            </Button>
            <Button variant="secondary" disabled={!canNext || loading} onClick={() => setPage(pageCount)}>
              Last
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}