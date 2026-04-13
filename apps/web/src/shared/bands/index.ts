// apps/web/src/shared/bands/index.ts

export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type BandStyle = {
  bg_color: string;
  text_color: string;
  border_color: string;
};

export type BandStyleMap = Record<BandKey, BandStyle>;

type BandStyleRow = {
  preset_key: string;
  band_key: string;
  bg_color: string;
  text_color: string;
  border_color: string;
};

export function buildBandStyleMap(args: {
  rows: BandStyleRow[];
  selectedPresetKey: string | null;
}): BandStyleMap {
  const { rows, selectedPresetKey } = args;

  const filtered = rows.filter(
    (r) => r.preset_key === selectedPresetKey
  );

  const map: Partial<BandStyleMap> = {};

  for (const r of filtered) {
    const key = normalizeBandKey(r.band_key);
    map[key] = {
      bg_color: r.bg_color,
      text_color: r.text_color,
      border_color: r.border_color,
    };
  }

  return {
    EXCEEDS: map.EXCEEDS ?? fallback(),
    MEETS: map.MEETS ?? fallback(),
    NEEDS_IMPROVEMENT: map.NEEDS_IMPROVEMENT ?? fallback(),
    MISSES: map.MISSES ?? fallback(),
    NO_DATA: map.NO_DATA ?? fallback(),
  };
}

export function normalizeBandKey(value: string | null | undefined): BandKey {
  if (value === "EXCEEDS") return "EXCEEDS";
  if (value === "MEETS") return "MEETS";
  if (value === "NEEDS_IMPROVEMENT") return "NEEDS_IMPROVEMENT";
  if (value === "MISSES") return "MISSES";
  return "NO_DATA";
}

function fallback(): BandStyle {
  return {
    bg_color: "#e5e7eb",
    text_color: "#111827",
    border_color: "#d1d5db",
  };
}