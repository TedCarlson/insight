export function inferType(value: any) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (value instanceof Date) return "date";
  return "string";
}

export function buildColumnMeta(
  row: Record<string, any>,
  editable: Set<string>,
  readonly: Set<string>
) {
  return Object.keys(row).map((key) => ({
    key,
    label: key.replace(/_/g, " "),
    type: inferType(row[key]),
    editable: editable.has(key),
    readonlyReason: readonly.has(key) ? "System field" : undefined,
  }));
}