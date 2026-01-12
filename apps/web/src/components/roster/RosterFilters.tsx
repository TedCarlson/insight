// apps/web/src/components/roster/RosterFilters.tsx
//
// Roster filter bar (DB-aligned, minimal surface)
// - Auto-applies via onChange (debounced search input)
// - Reset removed (redundant with auto-apply + clearing search)
// - Add button triggers overlay via onAddNew
//
// Notes:
// - options are passed through but not used here (kept for future wiring)
// - rows/totalCount used only for display stats

"use client";

import { useEffect, useMemo, useState } from "react";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";
import styles from "./RosterFilters.module.css";

type Props = {
  filters: RosterFilters;
  options: { msos: RosterOption[]; contractors: RosterOption[] };
  onChange: (next: Partial<RosterFilters>) => void;

  rows?: RosterRow[];
  totalCount?: number;

  onAddNew?: () => void;
};

export default function RosterFiltersUI(props: Props) {
  const { filters, rows, totalCount, onChange, onAddNew } = props;

  const [q, setQ] = useState(filters.q ?? "");

  useEffect(() => {
    setQ(filters.q ?? "");
  }, [filters.q]);

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
    <section className={styles.bar}>
      <div className={styles.barTop}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>

          <input
            className={styles.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roster…"
          />

          {q.length > 0 && (
            <button className={styles.clearBtn} onClick={() => setQ("")} title="Clear search" type="button">
              Clear
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.stats} title="Shown / Total (Active, Has Tech)">
            <span className={styles.stat}>{stats.shown}</span>
            <span className={styles.slash}>/</span>
            <span className={styles.stat}>{stats.total}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.small}>Active {stats.activeShown}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.small}>Tech {stats.techShown}</span>
          </div>

          {typeof onAddNew === "function" && (
            <button className={styles.primaryBtn} onClick={onAddNew} title="Add a new person" type="button">
              + Add Person
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
