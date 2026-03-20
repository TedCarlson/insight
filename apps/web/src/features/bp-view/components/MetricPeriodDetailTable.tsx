type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  widthClass?: string;
};

type Row = {
  key: string;
  cells: Array<string | number>;
};

export default function MetricPeriodDetailTable(props: {
  title: string;
  columns: Column[];
  rows: Row[];
  footer?: Row;
}) {
  function alignClass(align?: "left" | "right" | "center") {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  }

  return (
    <div className="rounded-2xl border bg-muted/10 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {props.title}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/20">
              {props.columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                    alignClass(col.align),
                    col.widthClass ?? "",
                  ].join(" ")}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {props.rows.map((row) => (
              <tr key={row.key} className="border-b last:border-b-0">
                {row.cells.map((cell, idx) => (
                  <td
                    key={`${row.key}-${idx}`}
                    className={[
                      "px-3 py-2 text-sm",
                      alignClass(props.columns[idx]?.align),
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {props.footer ? (
            <tfoot>
              <tr className="border-t bg-muted/10">
                {props.footer.cells.map((cell, idx) => (
                  <td
                    key={`footer-${idx}`}
                    className={[
                      "px-3 py-2 text-sm font-semibold",
                      alignClass(props.columns[idx]?.align),
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}