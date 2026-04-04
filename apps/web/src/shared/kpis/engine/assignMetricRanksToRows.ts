import type { WorkforceMetricCell } from "./workforceTypes";

type Definition = {
  kpi_key: string;
  direction?: string | null;
};

type Row = {
  tech_id?: string | null;
  full_name?: string | null;
  label?: string | null;
  metrics: WorkforceMetricCell[];
};

function normalizeDirection(direction: string | null | undefined) {
  const upper = String(direction ?? "").trim().toUpperCase();

  if (
    upper === "LOWER" ||
    upper === "LOWER_BETTER" ||
    upper === "ASC" ||
    upper === "ASCENDING"
  ) {
    return "LOWER";
  }

  return "HIGHER";
}

function compare(
  a: number | null,
  b: number | null,
  direction?: string | null
) {
  const dir = normalizeDirection(direction);

  const av =
    a == null || !Number.isFinite(a)
      ? dir === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : a;

  const bv =
    b == null || !Number.isFinite(b)
      ? dir === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : b;

  return dir === "LOWER" ? av - bv : bv - av;
}

export function assignMetricRanksToRows<T extends Row>(
  rows: T[],
  definitions: Definition[]
) {
  for (const def of definitions) {
    const ranked = rows
      .map((row) => ({
        row,
        cell: row.metrics.find((m) => m.kpi_key === def.kpi_key) ?? null,
      }))
      .filter(
        (
          entry
        ): entry is {
          row: T;
          cell: WorkforceMetricCell;
        } => !!entry.cell
      )
      .sort((a, b) => {
        const byValue = compare(a.cell.value ?? null, b.cell.value ?? null, def.direction);
        if (byValue !== 0) return byValue;

        const aTech = String(a.row.tech_id ?? "").trim();
        const bTech = String(b.row.tech_id ?? "").trim();
        if (aTech || bTech) return aTech.localeCompare(bTech);

        const aName = String(a.row.full_name ?? a.row.label ?? "").trim();
        const bName = String(b.row.full_name ?? b.row.label ?? "").trim();
        return aName.localeCompare(bName);
      });

    let prev: number | null = null;
    let hasPrev = false;
    let rank = 0;

    ranked.forEach((entry, index) => {
      const val =
        entry.cell.value != null && Number.isFinite(entry.cell.value)
          ? entry.cell.value
          : null;

      const sameAsPrev =
        hasPrev &&
        prev != null &&
        val != null &&
        prev === val;

      if (!sameAsPrev) {
        rank = index + 1;
      }

      entry.cell.rank_value = rank;
      entry.cell.rank_display = `#${rank}`;
      entry.cell.rank_delta_value = null;
      entry.cell.rank_delta_display = null;

      prev = val;
      hasPrev = true;
    });
  }

  return rows;
}