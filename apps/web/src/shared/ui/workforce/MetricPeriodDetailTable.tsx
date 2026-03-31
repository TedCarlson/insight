type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  widthClass?: string;
};

type Row = {
  key: string;
  cells: Array<string | number | null>;
};

type Footer = {
  key: string;
  cells: Array<string | number | null>;
};

type Props = {
  title?: string;
  columns: Column[];
  rows: Row[];
  footer?: Footer | null;
};

function cellAlignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function displayCell(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function MetricPeriodDetailTable({
  title = "Period Detail",
  columns,
  rows,
  footer,
}: Props) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-4">
      <div className="text-sm font-semibold">{title}</div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    "px-3 py-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
                    cellAlignClass(column.align),
                    column.widthClass ?? "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-b-0">
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.key}-${index}`}
                    className={[
                      "px-3 py-3",
                      cellAlignClass(columns[index]?.align),
                    ].join(" ")}
                  >
                    {displayCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {footer ? (
            <tfoot>
              <tr className="border-t bg-muted/10 font-semibold">
                {footer.cells.map((cell, index) => (
                  <td
                    key={`${footer.key}-${index}`}
                    className={[
                      "px-3 py-3",
                      cellAlignClass(columns[index]?.align),
                    ].join(" ")}
                  >
                    {displayCell(cell)}
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