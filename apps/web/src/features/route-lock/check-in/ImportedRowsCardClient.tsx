// RUN THIS
// Create (or replace) the entire file:
// apps/web/src/features/route-lock/check-in/ImportedRowsCardClient.tsx

"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type CheckInDayFactRow = {
  shift_date: string;
  tech_id: string;
  fulfillment_center_id: number;
  fiscal_end_date: string;
  actual_jobs: number;
  actual_units: number;
  actual_hours: number;
  first_start_time: string | null;
  last_cp_time: string | null;
};

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function fmtNum(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type SortKey = "shift_date" | "tech_id" | "actual_jobs" | "actual_units" | "actual_hours";

export function ImportedRowsCardClient({
  rows,
  today,
  pageSize = 50,
}: {
  rows: CheckInDayFactRow[];
  today: string; // ISO date for a soft highlight only
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("shift_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) => {
      const t = (r.tech_id ?? "").toLowerCase();
      const d = (r.shift_date ?? "").toLowerCase();
      return t.includes(needle) || d.includes(needle);
    });
  }, [rows, q]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortKey === "shift_date") return dir * String(a.shift_date).localeCompare(String(b.shift_date));
      if (sortKey === "tech_id") return dir * String(a.tech_id).localeCompare(String(b.tech_id));

      if (sortKey === "actual_jobs") return dir * (toInt(a.actual_jobs) - toInt(b.actual_jobs));
      if (sortKey === "actual_units") return dir * (toNum(a.actual_units) - toNum(b.actual_units));
      if (sortKey === "actual_hours") return dir * (toNum(a.actual_hours) - toNum(b.actual_hours));

      return 0;
    });

    // When sorting by date desc (default), we usually want tech_id stable within a date
    if (sortKey === "shift_date") {
      copy.sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const c = dir * String(a.shift_date).localeCompare(String(b.shift_date));
        if (c !== 0) return c;
        return String(a.tech_id).localeCompare(String(b.tech_id));
      });
    }

    return copy;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function setSort(next: SortKey) {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(next);
      setSortDir(next === "shift_date" ? "desc" : "asc");
    }
    setPage(1);
  }

  function prev() {
    setPage((p) => Math.max(1, p - 1));
  }
  function next() {
    setPage((p) => Math.min(pages, p + 1));
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-5">Imported Rows</div>
          <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
            Read-only day facts · Grain: pc_org_id · shift_date · tech_id
          </div>
        </div>

        <div className="text-[11px] text-[var(--to-ink-muted)] tabular-nums">
          {fmtInt(total)} rows · {fmtInt(pages)} pages
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by tech_id or date…"
            className="h-9 w-full sm:w-72 rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setSort("shift_date")}>
            Date {sortKey === "shift_date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setSort("tech_id")}>
            Tech {sortKey === "tech_id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setSort("actual_jobs")}>
            Jobs {sortKey === "actual_jobs" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </Button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] text-[var(--to-ink-muted)]">
            <tr className="border-b border-[var(--to-border)]">
              <th className="py-2 pr-3 text-left font-medium">Date</th>
              <th className="py-2 pr-3 text-left font-medium">Tech</th>
              <th className="py-2 pr-3 text-left font-medium">FC</th>
              <th className="py-2 pr-3 text-right font-medium">Jobs</th>
              <th className="py-2 pr-3 text-right font-medium">Units</th>
              <th className="py-2 pr-3 text-right font-medium">Hours</th>
              <th className="py-2 pr-3 text-left font-medium">First</th>
              <th className="py-2 text-left font-medium">Last</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-[11px] text-[var(--to-ink-muted)]">
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              slice.map((r) => (
                <tr
                  key={`${r.shift_date}::${r.tech_id}`}
                  className={cls(
                    "border-b border-[var(--to-border)]",
                    r.shift_date === today && "bg-black/5",
                  )}
                >
                  <td className="py-2 pr-3 font-mono text-[12px]">{r.shift_date}</td>
                  <td className="py-2 pr-3 font-mono text-[12px]">{r.tech_id}</td>
                  <td className="py-2 pr-3 text-[12px] text-[var(--to-ink-muted)]">{r.fulfillment_center_id}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(toInt(r.actual_jobs))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(toNum(r.actual_units), 1)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(toNum(r.actual_hours), 1)}</td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-[var(--to-ink-muted)]">{r.first_start_time ?? "—"}</td>
                  <td className="py-2 font-mono text-[12px] text-[var(--to-ink-muted)]">{r.last_cp_time ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-[var(--to-ink-muted)] tabular-nums">
          Page {safePage} / {pages}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={prev} disabled={safePage <= 1}>
            Prev
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-xs" onClick={next} disabled={safePage >= pages}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}