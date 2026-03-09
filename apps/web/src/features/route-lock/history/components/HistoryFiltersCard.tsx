"use client";

import { useEffect, useRef } from "react";
import type { TechSearchItem } from "../lib/history.types";

type Props = {
  techQuery: string;
  setTechQuery: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  selectedTech: TechSearchItem | null;
  onPickTech: (item: TechSearchItem) => void;
  onClearTech: () => void;
  onClearedSelectionByTyping: () => void;
  canSearch: boolean;
  searchOpen: boolean;
  setSearchOpen: (value: boolean) => void;
  searchBusy: boolean;
  searchError: string | null;
  searchItems: TechSearchItem[];
};

export default function HistoryFiltersCard(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        props.setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [props]);

  return (
    <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div ref={rootRef} className="relative flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-[var(--to-ink-muted)]">
            Tech Search
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={props.techQuery}
              onChange={(e) => {
                const next = e.target.value;
                props.setTechQuery(next);

                if (
                  props.selectedTech &&
                  next !== `${props.selectedTech.full_name} • ${props.selectedTech.tech_id}`
                ) {
                  props.onClearedSelectionByTyping();
                }
              }}
              onFocus={() => {
                if (props.searchItems.length || props.searchError) props.setSearchOpen(true);
              }}
              placeholder="Name or Tech ID"
              className="h-9 w-full rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 text-sm outline-none focus:border-[rgba(59,130,246,0.65)]"
            />

            {props.selectedTech ? (
              <button
                type="button"
                onClick={props.onClearTech}
                className="inline-flex h-9 items-center rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 text-sm text-[var(--to-ink)]"
              >
                Clear
              </button>
            ) : null}
          </div>

          {props.searchOpen ? (
            <div className="absolute top-[calc(100%+6px)] z-20 max-h-80 w-full overflow-auto rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] shadow-lg">
              {props.searchBusy ? (
                <div className="px-3 py-2 text-sm text-[var(--to-ink-muted)]">Searching…</div>
              ) : props.searchError ? (
                <div className="px-3 py-2 text-sm text-[var(--to-danger,#b91c1c)]">
                  {props.searchError}
                </div>
              ) : props.searchItems.length ? (
                <div className="py-1">
                  {props.searchItems.map((item) => (
                    <button
                      key={`${item.assignment_id}::${item.tech_id}`}
                      type="button"
                      onClick={() => props.onPickTech(item)}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--to-surface-2)]"
                    >
                      <span className="text-sm font-medium text-[var(--to-ink)]">
                        {item.full_name}
                      </span>
                      <span className="text-xs text-[var(--to-ink-muted)]">
                        Tech ID: {item.tech_id}
                        {item.co_name ? ` • ${item.co_name}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : props.canSearch ? (
                <div className="px-3 py-2 text-sm text-[var(--to-ink-muted)]">
                  No matching technicians.
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-[var(--to-ink-muted)]">
                  Type a name or Tech ID.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-[var(--to-ink-muted)]">
            From Date
          </label>
          <input
            type="date"
            value={props.fromDate}
            onChange={(e) => props.setFromDate(e.target.value)}
            className="h-9 rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 text-sm outline-none focus:border-[rgba(59,130,246,0.65)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-[var(--to-ink-muted)]">
            To Date
          </label>
          <input
            type="date"
            value={props.toDate}
            onChange={(e) => props.setToDate(e.target.value)}
            className="h-9 rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 text-sm outline-none focus:border-[rgba(59,130,246,0.65)]"
          />
        </div>
      </div>
    </div>
  );
}