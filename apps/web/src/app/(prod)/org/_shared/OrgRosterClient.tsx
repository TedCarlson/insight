"use client";

import * as React from "react";

type Row = Record<string, any>;

type Mode = "active" | "all";

const HIDDEN_COLS = new Set([
  "pc_org_id",
  "person_id",
  "assignment_id",
]);

function isActiveRow(r: Row) {
  // Active is end_date null/empty (preferred), fallback to active===true if present.
  const end = r?.end_date;
  if (end === null || end === undefined || String(end).trim() === "") return true;
  if (typeof r?.active === "boolean") return r.active === true;
  return false;
}

export function OrgRosterClient(props: { rows: Row[] }) {
  const [mode, setMode] = React.useState<Mode>("active");
  const [open, setOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (mode === "all") return props.rows;
    return props.rows.filter(isActiveRow);
  }, [mode, props.rows]);

  const cols = React.useMemo(() => {
    const first = filtered[0] ?? props.rows[0] ?? {};
    return Object.keys(first).filter((c) => !HIDDEN_COLS.has(c));
  }, [filtered, props.rows]);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--to-border)",
              background: mode === "active" ? "var(--to-surface-2)" : "transparent",
            }}
            onClick={() => setMode("active")}
          >
            Active
          </button>

          <button
            type="button"
            className="rounded border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--to-border)",
              background: mode === "all" ? "var(--to-surface-2)" : "transparent",
            }}
            onClick={() => setMode("all")}
          >
            All
          </button>

          <div className="ml-2 text-sm text-[var(--to-ink-muted)]">
            Showing {filtered.length} row(s)
          </div>
        </div>

        <button
          type="button"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
          onClick={() => setOpen(true)}
        >
          + Bring person (global unassigned)
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--to-ink-muted)]">
          No rows to display for this filter.
        </p>
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="min-w-[900px] text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={idx}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "var(--to-border)" }}
                >
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 align-top">
                      {r?.[c] === null || r?.[c] === undefined ? "" : String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal stub */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded border bg-[var(--to-surface)] p-4"
            style={{ borderColor: "var(--to-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Bring person (global unassigned)</div>
                <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                  Coming next: search globally unassigned people and create an assignment in this org.
                </div>
              </div>

              <button
                type="button"
                className="rounded border px-2 py-1 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-sm text-[var(--to-ink-muted)]">
              Next PR will add:
              <ul className="mt-2 list-disc pl-5">
                <li>RPC-backed search: globally unassigned</li>
                <li>Pick title + start date</li>
                <li>Create assignment into this org</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
