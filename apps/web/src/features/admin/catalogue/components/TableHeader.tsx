export function TableHeader(props: {
  label: string;
  tableKey: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-lg font-semibold">{props.label}</h2>
      <div className="text-xs text-[var(--to-ink-muted)]">
        Table: {props.tableKey}
      </div>
    </div>
  );
}