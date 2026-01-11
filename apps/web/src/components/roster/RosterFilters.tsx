// apps/web/src/components/roster/RosterFilters.tsx
//
// Roster filter bar (DB-aligned, minimal surface)
// - Auto-applies via onChange (debounced search input)
// - Reset removed (redundant with auto-apply + clearing search)
// - Add button triggers overlay via onAddNew
//
// Notes:
// - options are passed through but not used here (kept for future wiring)
// - rows/totalCount used only for display stats (safe for RLS/empty arrays)

"use client";

import { useEffect, useMemo, useState } from "react";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";

type Props = {
  filters: RosterFilters;
  options: { msos: RosterOption[]; contractors: RosterOption[] }; // intentionally unused (kept to avoid refactor)
  onChange: (next: Partial<RosterFilters>) => void;

  rows?: RosterRow[];
  totalCount?: number;

  // OPTIONAL: overlay entry (only show button if provided)
  onAddNew?: () => void;
};

export default function RosterFiltersUI(props: Props) {
  const { filters, rows, totalCount, onChange, onAddNew } = props;

  // Local state for debounced search
  const [q, setQ] = useState(filters.q ?? "");

  // Sync when parent changes filters (URL push / server nav)
  useEffect(() => {
    setQ(filters.q ?? "");
  }, [filters.q]);

  // Debounce search → auto-apply
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== q) onChange({ q });
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const stats = useMemo(() => {
    const rs = rows ?? [];
    const shown = rs.length;

    const activeShown = rs.reduce((acc, r) => acc + (r.active_flag ? 1 : 0), 0);
    const techShown = rs.reduce((acc, r) => acc + (r.tech_id ? 1 : 0), 0);

    const total = typeof totalCount === "number" ? totalCount : shown;

    return { shown, total, activeShown, techShown };
  }, [rows, totalCount]);

  return (
    <section className="bar">
      <div className="barTop">
        <div className="searchWrap">
          <span className="searchIcon" aria-hidden>
            ⌕
          </span>

          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roster…" />

          {q.length > 0 && (
            <button className="clearBtn" onClick={() => setQ("")} title="Clear search" type="button">
              Clear
            </button>
          )}
        </div>

        <div className="actions">
          <div className="stats" title="Shown / Total (Active, Has Tech)">
            <span className="stat">{stats.shown}</span>
            <span className="slash">/</span>
            <span className="stat">{stats.total}</span>
            <span className="dot">•</span>
            <span className="small">Active {stats.activeShown}</span>
            <span className="dot">•</span>
            <span className="small">Tech {stats.techShown}</span>
          </div>

          {typeof onAddNew === "function" && (
            <button className="primaryBtn" onClick={onAddNew} title="Add a new person" type="button">
              + Add Person
            </button>
          )}
        </div>
      </div>

      <style>{`
        .bar {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          border-radius: 12px;
          padding: 12px 12px;
        }

        .barTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .searchWrap {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 8px 10px;
          min-width: 320px;
          flex: 1;
        }

        .searchIcon {
          width: 18px;
          opacity: 0.55;
          margin-right: 6px;
          font-size: 14px;
        }

        .search {
          flex: 1;
          border: 0;
          outline: none;
          font-size: 14px;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .stats {
          font-size: 12px;
          opacity: 0.75;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat {
          font-weight: 650;
          opacity: 0.9;
        }

        .small {
          opacity: 0.8;
        }

        .slash,
        .dot {
          opacity: 0.55;
        }

        .clearBtn {
          border: 0;
          background: transparent;
          font-size: 13px;
          opacity: 0.85;
          cursor: pointer;
        }

        .primaryBtn {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #111;
          color: #fff;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}
