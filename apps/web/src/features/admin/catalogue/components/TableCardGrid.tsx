"use client";

import { ADMIN_TABLES } from "../lib/tables";

export function TableCardGrid(props: {
  selectedTable: string | null;
  onSelectTable: (key: string) => void;
}) {
  const { selectedTable, onSelectTable } = props;

  const groups = ADMIN_TABLES.reduce<Record<string, typeof ADMIN_TABLES>>((acc, t) => {
    acc[t.group] ??= [];
    acc[t.group].push(t);
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      {Object.entries(groups).map(([group, tables]) => (
        <div key={group} className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            {group}
          </div>

          {/* “Switch” rail wrapper */}
          <div
            className="rounded border p-1 grid gap-1"
            style={{ borderColor: "var(--to-border)" }}
          >
            {tables.map((t) => {
              const active = selectedTable === t.key;

              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onSelectTable(t.key)}
                  className={[
                    "w-full rounded px-2 py-2 text-left text-sm",
                    "hover:bg-[var(--to-surface-2)]",
                    active ? "bg-[var(--to-surface-2)] font-medium" : "",
                  ].join(" ")}
                >
                  <span>{t.label}</span>
                  <span className="ml-2 text-xs font-mono text-[var(--to-ink-muted)]">
                    {t.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}