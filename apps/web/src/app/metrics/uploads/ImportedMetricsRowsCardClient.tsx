"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type MetricsRawRow = {
  fiscal_end_date: string; // YYYY-MM-DD
  tech_id: string;
  unique_row_key: string;
  batch_id?: string | null;
};

function includesCI(hay: string | null | undefined, needle: string) {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle);
}

export function ImportedMetricsRowsCardClient({
  rows,
  pageSize = 50,
}: {
  rows: MetricsRawRow[];
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [fiscalEnd, setFiscalEnd] = useState(""); // optional filter
  const [page, setPage] = useState(1);

  const qNorm = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    let out = rows;

    if (fiscalEnd) {
      out = out.filter((r) => r.fiscal_end_date === fiscalEnd);
    }

    if (qNorm) {
      out = out.filter((r) => {
        return includesCI(r.tech_id, qNorm) || includesCI(r.unique_row_key, qNorm);
      });
    }

    return out;
  }, [rows, fiscalEnd, qNorm]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const fromIdx = (safePage - 1) * pageSize;
  const toIdx = Math.min(fromIdx + pageSize, total);
  const pageRows = filtered.slice(fromIdx, toIdx);

  const hasFilters = Boolean(qNorm || fiscalEnd);

  const fiscalEndOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.fiscal_end_date);
    return Array.from(set).sort();
  }, [rows]);

  function onChangeQ(v: string) {
    setQ(v);
    setPage(1);
  }

  function onChangeFiscalEnd(v: string) {
    setFiscalEnd(v);
    setPage(1);
  }

  function clear() {
    setQ("");
    setFiscalEnd("");
    setPage(1);
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-medium">Imported metrics (raw bucket)</div>

          <div className="flex items-center gap-2">
            <select
              value={fiscalEnd}
              onChange={(e) => onChangeFiscalEnd(e.target.value)}
              className="h-8 rounded-md border border-[color:var(--to-border)] bg-transparent px-2 text-xs"
            >
              <option value="">All fiscal months</option>
              {fiscalEndOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={q}
              onChange={(e) => onChangeQ(e.target.value)}
              placeholder="Filter (tech id / key)…"
              className="h-8 w-[220px] rounded-md border border-[color:var(--to-border)] bg-transparent px-2 text-xs"
            />

            {hasFilters ? (
              <Button variant="ghost" className="h-8 px-2 text-xs" onClick={clear}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[680px] overflow-auto rounded-md border border-[color:var(--to-border)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[color:var(--to-surface)] text-left text-[var(--to-ink-muted)]">
              <tr className="border-b">
                <th className="py-2 pr-4 pl-3">Fiscal End</th>
                <th className="py-2 pr-4">Tech ID</th>
                <th className="py-2 pr-4">Unique Row Key</th>
              </tr>
            </thead>

            <tbody>
              {total === 0 ? (
                <tr>
                  <td className="py-6 text-[var(--to-ink-muted)] pl-3" colSpan={3}>
                    No rows match the current filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, idx) => (
                  <tr
                    key={`${r.fiscal_end_date}-${r.tech_id}-${idx}`}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-2 pr-4 pl-3">{r.fiscal_end_date}</td>
                    <td className="py-2 pr-4">{r.tech_id}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.unique_row_key}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="sticky bottom-0 border-t border-[color:var(--to-border)] bg-[color:var(--to-surface)]">
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--to-ink-muted)]">
              <div>
                Showing <span className="text-[var(--to-ink)]">{total === 0 ? 0 : fromIdx + 1}</span>–{" "}
                <span className="text-[var(--to-ink)]">{toIdx}</span> of{" "}
                <span className="text-[var(--to-ink)]">{total}</span>
                {totalPages > 1 ? (
                  <>
                    {" "}
                    • Page <span className="text-[var(--to-ink)]">{safePage}</span> /{" "}
                    <span className="text-[var(--to-ink)]">{totalPages}</span>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>

                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--to-ink-muted)]">
          MVP view: shows raw bucket identifiers only (fiscal end date, tech id, unique key). Metrics crunch/ranks are Phase 2.
        </div>
      </div>
    </Card>
  );
}