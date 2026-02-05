"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export type ImportRow = {
  shift_date: string;
  tech_id: string;
  shift_duration: number | null;
  target_unit: number | null;
  route_criteria: string | null;
  route_areas: string | null;
  office: string | null;
};

function withinWindow(iso: string, today: string, maxDay: string) {
  return iso >= today && iso <= maxDay;
}

function includesCI(hay: string | null | undefined, needle: string) {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle);
}

export function ImportedRowsCardClient({
  rows,
  today,
  maxDay,
  pageSize = 50,
}: {
  rows: ImportRow[];
  today: string;
  maxDay: string;
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [day, setDay] = useState(""); // optional date filter
  const [page, setPage] = useState(1);

  const qNorm = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    let out = rows;

    if (day && withinWindow(day, today, maxDay)) {
      out = out.filter((r) => r.shift_date === day);
    }

    if (qNorm) {
      out = out.filter((r) => {
        return (
          includesCI(r.tech_id, qNorm) ||
          includesCI(r.route_areas, qNorm) ||
          includesCI(r.route_criteria, qNorm) ||
          includesCI(r.office, qNorm)
        );
      });
    }

    return out;
  }, [rows, day, qNorm, today, maxDay]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const fromIdx = (safePage - 1) * pageSize;
  const toIdx = Math.min(fromIdx + pageSize, total);
  const pageRows = filtered.slice(fromIdx, toIdx);

  const hasFilters = Boolean(qNorm || day);

  function onChangeQ(v: string) {
    setQ(v);
    setPage(1);
  }

  function onChangeDay(v: string) {
    setDay(v);
    setPage(1);
  }

  function clear() {
    setQ("");
    setDay("");
    setPage(1);
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-medium">Imported rows (MVP view)</div>

          {/* instant filter controls */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={day}
              min={today}
              max={maxDay}
              onChange={(e) => onChangeDay(e.target.value)}
              className="h-8 rounded-md border border-[color:var(--to-border)] bg-transparent px-2 text-xs"
            />

            <input
              type="text"
              value={q}
              onChange={(e) => onChangeQ(e.target.value)}
              placeholder="Filter (tech, route area, office)…"
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
                <th className="py-2 pr-4 pl-3">Shift Date</th>
                <th className="py-2 pr-4">Tech #</th>
                <th className="py-2 pr-4">Shift Duration</th>
                <th className="py-2 pr-4">Target Unit</th>
                <th className="py-2 pr-4">Route Criteria</th>
                <th className="py-2 pr-4">Route Areas</th>
                <th className="py-2 pr-4">Office</th>
              </tr>
            </thead>

            <tbody>
              {total === 0 ? (
                <tr>
                  <td className="py-6 text-[var(--to-ink-muted)] pl-3" colSpan={7}>
                    No rows match the current filters in the 14-day window.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, idx) => (
                  <tr key={`${r.shift_date}-${r.tech_id}-${idx}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 pl-3">{r.shift_date}</td>
                    <td className="py-2 pr-4">{r.tech_id}</td>
                    <td className="py-2 pr-4">{r.shift_duration ?? ""}</td>
                    <td className="py-2 pr-4">{r.target_unit ?? ""}</td>
                    <td className="py-2 pr-4">{r.route_criteria ?? ""}</td>
                    <td className="py-2 pr-4">{r.route_areas ?? ""}</td>
                    <td className="py-2 pr-4">{r.office ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* sticky footer */}
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
          Filtering is instant and runs against the current 14-day imported snapshot (today onward).
        </div>
      </div>
    </Card>
  );
}