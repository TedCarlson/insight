import { ADMIN_TABLES } from "../lib/tables";

export function TableList(props: {
  selectedTable: string | null;
  onSelectTable: (key: string) => void;
}) {
  const { selectedTable, onSelectTable } = props;

  const groups = ADMIN_TABLES.reduce<Record<string, typeof ADMIN_TABLES>>(
    (acc, t) => {
      acc[t.group] ??= [];
      acc[t.group].push(t);
      return acc;
    },
    {}
  );

  return (
    <div className="grid gap-3">
      <div className="text-xs font-semibold uppercase text-[var(--to-ink-muted)]">Catalogue</div>

      {Object.entries(groups).map(([group, tables]) => (
        <div key={group} className="grid gap-1">
          <div className="text-xs uppercase text-[var(--to-ink-muted)]">
            {group}
          </div>

          {tables.map((t) => {
            const active = selectedTable === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onSelectTable(t.key)}
                className={`rounded px-2 py-1 text-left text-sm ${
                  active ? "bg-[var(--to-surface-2)] font-medium" : ""
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}