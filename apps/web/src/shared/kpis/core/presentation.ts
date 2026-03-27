import type { KpiBandKey } from "./types";

type RubricRow = {
  band_key: KpiBandKey;
  min_value: number | null;
  max_value: number | null;
};

type Args = {
  kpiKey: string;
  value: number | null;
  rubric: RubricRow[];
};

function resolveBand(
  value: number | null,
  rubric: RubricRow[]
): RubricRow | null {
  if (!rubric || rubric.length === 0) return null;

  if (value === null || Number.isNaN(value)) {
    return rubric.find((r) => r.band_key === "NO_DATA") ?? null;
  }

  // 1. Try strict match first
  for (const row of rubric) {
    const min = row.min_value;
    const max = row.max_value;

    const meetsMin = min === null || value >= min;
    const meetsMax = max === null || value <= max;

    if (meetsMin && meetsMax) {
      return row;
    }
  }

  // 2. Fallback: pick closest band (prevents NO_DATA collapse)
  let closest: RubricRow | null = null;
  let smallestDistance = Infinity;

  for (const row of rubric) {
    const min = row.min_value ?? -Infinity;
    const max = row.max_value ?? Infinity;

    let distance = 0;

    if (value < min) {
      distance = min - value;
    } else if (value > max) {
      distance = value - max;
    } else {
      distance = 0;
    }

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = row;
    }
  }

  return closest ?? rubric.find((r) => r.band_key === "NO_DATA") ?? null;
}

function formatValue(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return value.toFixed(2);
}

function bandLabel(bandKey: KpiBandKey): string {
  switch (bandKey) {
    case "EXCEEDS":
      return "EXCEEDS";
    case "MEETS":
      return "MEETS";
    case "NEEDS_IMPROVEMENT":
      return "NEEDS IMPROVEMENT";
    case "MISSES":
      return "MISSES";
    case "NO_DATA":
    default:
      return "NO DATA";
  }
}

export function resolveKpiPresentation({
  kpiKey,
  value,
  rubric,
}: Args) {
  const band = resolveBand(value, rubric);

  const bandKey: KpiBandKey = band?.band_key ?? "NO_DATA";

  return {
    label: kpiKey,
    value,
    value_display: formatValue(value),
    band_key: bandKey,
    band_label: bandLabel(bandKey),
  };
}