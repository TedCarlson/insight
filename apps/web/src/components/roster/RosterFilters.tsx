// apps/web/src/components/roster/RosterFilters.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";

type Props = {
  filters: RosterFilters;
  options: { msos: RosterOption[]; contractors: RosterOption[] }; // unused for now (kept to avoid refactor)
  onChange: (next: Partial<RosterFilters>) => void;
  onReset: () => void;

  // OPTIONAL: overlay entry (only show button if provided)
  onAddNew?: () => void;

  // Current rows + count for dynamic stats
  rows?: RosterRow[];
  totalCount?: number;
};

function fmt(n: number) {
  return n.toLocaleString();
}

export default function RosterFiltersUI({
  filters,
  onChange,
  onReset,
  onAddNew,
  rows,
  totalCount,
}: Props) {
  const [q, setQ] = useState(filters.q ?? "");

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
    const inactiveShown = shown - activeShown;

    const withTechId = rs.reduce((acc, r) => acc + (r.tech_id ? 1 : 0), 0);

    return {
      shown,
      activeShown,
      inactiveShown,
      withTechId,
      totalCount: typeof totalCount === "number" ? totalCount : null,
    };
  }, [rows, totalCount]);

  return (
    <section className="bar">
      <div className="barTop">
        <div className="searchWrap">
          <span className="searchIcon" aria-hidden>
            ⌕
          </span>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roster (name, tech id, email, entity, region, office…)…"
          />
          {q.length > 0 && (
            <button className="clearBtn" onClick={() => setQ("")} title="Clear search" type="button">
              Clear
            </button>
          )}
        </div>

        <div className="actions">
          <button className="ghostBtn" onClick={onReset} title="Reset filters" type="button">
            Reset
          </button>

          {typeof onAddNew === "function" && (
            <button className="primaryBtn" onClick={onAddNew} title="Add a new person" type="button">
              + Add Person
            </button>
          )}
        </div>
      </div>

      <div className="statsRow">
        <div className="stat">
          <div className="statLabel">Shown</div>
          <div className="statValue">{fmt(stats.shown)}</div>
        </div>

        <div className="stat">
          <div className="statLabel">Active</div>
          <div className="statValue">{fmt(stats.activeShown)}</div>
        </div>

        <div className="stat">
          <div className="statLabel">Inactive</div>
          <div className="statValue">{fmt(stats.inactiveShown)}</div>
        </div>

        <div className="stat">
          <div className="statLabel">With Tech ID</div>
          <div className="statValue">{fmt(stats.withTechId)}</div>
        </div>

        {stats.totalCount !== null && (
          <div className="stat statRight">
            <div className="statLabel">Total</div>
            <div className="statValue">{fmt(stats.totalCount)}</div>
          </div>
        )}
      </div>

      <style>{`
        .bar {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06);
          padding: 14px;
        }

        .barTop {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .searchWrap {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 14px;
          background: linear-gradient(to bottom, #ffffff, #fbfbfc);
          padding: 10px 12px;
          min-height: 44px;
        }

        .searchIcon {
          width: 18px;
          opacity: 0.55;
          margin-right: 10px;
          font-size: 14px;
        }

        .search {
          flex: 1;
          border: 0;
          outline: none;
          font-size: 14px;
          background: transparent;
        }

        .clearBtn {
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(0,0,0,0.03);
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
        }

        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .ghostBtn {
          border: 1px solid rgba(0,0,0,0.10);
          background: #fff;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          transition: background 140ms ease;
          min-height: 44px;
        }
        .ghostBtn:hover {
          background: rgba(0,0,0,0.03);
        }

        .primaryBtn {
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.92);
          color: #fff;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          transition: transform 120ms ease, background 140ms ease;
          min-height: 44px;
          white-space: nowrap;
        }
        .primaryBtn:hover {
          background: rgba(0,0,0,0.86);
        }
        .primaryBtn:active {
          transform: translateY(1px);
        }

        .statsRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .stat {
          padding: 10px 12px;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          background: #fff;
          min-width: 120px;
        }

        .statRight {
          margin-left: auto;
        }

        .statLabel {
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(0,0,0,0.55);
        }

        .statValue {
          margin-top: 3px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        @media (max-width: 640px) {
          .barTop {
            flex-direction: column;
            align-items: stretch;
          }
          .actions {
            justify-content: flex-end;
          }
          .stat {
            min-width: 0;
            flex: 1;
          }
          .statRight {
            margin-left: 0;
          }
        }
      `}</style>
    </section>
  );
}
